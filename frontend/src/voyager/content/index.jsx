const Content = styled.div`
  flex: 1;
  padding: 20px;
  background-color: #f9f9f9;
  width: 100%;
  overflow: auto;
  // position: relative;
`;

const Overlay = styled.div`
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 50%;
  background-color: #fff;
`;

const Grid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;

  @media (min-width: 600px) {
    gap: 20px;
  }
`;

const GridItem = styled.div`
  flex: 1 0 calc(33.333% - 10px); // Three per row by default

  @media (min-width: 600px) {
    flex: 1 0 calc(25% - 20px); // Four per row on wider screens
  }
`;

const Columns = styled.div`
  display: flex;
`;

const Column = styled.div`
  min-width: 200px;
  border-right: 1px solid #e0e0e0;
`;

const layout = props.layout || "LIST";
const setPath = props.setPath || (() => {});
const path = props.path || context.accountId;

const showPreview = props.showPreview || false;
const setSelectedPath = props.setSelectedPath || (() => {});
const selectedPath = props.selectedPath || "";
const password = props.password || "";

const { newSecretKey, decryptObject } = VM.require(
  "fastvault.near/widget/module.crypto"
);

const [storageSk, _] = useState(() => {
  if (decryptSk) {
    // decryptSk is available. use it instead of recovering
    if (password) {
      console.log("Utilizing decryptSk over password");
    }
    return decryptSk;
  }
  const localSk = Storage.privateGet("storage_secret");
  if (localSk && !password) {
    return localSk;
  }
  const sk = newSecretKey(context.accountId, password);
  console.log("recovered decryption key from local storage");
  Storage.privateSet("storage_secret", sk);
  return sk;
});

// --- FV START ---
const files = Social.index("fastvault_experimental", "add", {
  accountId: context.accountId,
});

console.log("indexed", files);
let data = {};
if (files) {
  data = files.reduce((acc, file) => {
    const encryptedMetadata = file.value;
    if (!encryptedMetadata.nonce || !encryptedMetadata.ciphertext) {
      console.log("invalid file metadata to be decrypted", file);
      return acc;
    }

    const metadata = decryptObject(
      new Uint8Array(encryptedMetadata.nonce),
      new Uint8Array(encryptedMetadata.ciphertext),
      storageSk
    );

    // acc[metadata.filename] = metadata.cid + "|" + (metadata.filetype ?? "???");
    acc[metadata.filename] = {
      value: metadata.cid + "|" + (metadata.filetype ?? "???"),
      cid: metadata.cid,
      filetype: metadata.filetype,
      byteSize: metadata.byteSize,
    };

    return acc;
  }, {});
}
// --- FV END ---

// console.log(selectedPath);

if (!data) {
  return <p>Loading...</p>;
}

State.init({
  activePath: [],
  selectedPath: "",
  showTextDialog: false,
  dataToDisplay: null
});

function setActivePath(v) {
  State.update({ activePath: v });
}

const ArrowIcon = styled.span`
  display: inline-block;
  width: 10px;
  height: 10px;
  border-top: 2px solid black;
  border-right: 2px solid black;
  transform: ${(props) =>
    props.isExpanded ? "rotate(135deg)" : "rotate(45deg)"};
  margin-right: 5px;
`;

const ItemContainer = styled.span`
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  font-size: 18px;
`;

const ItemInfo = styled.span`
  display: flex;
  gap: 10px;
  width: 200px;
  justify-content: space-between;
`;

const ItemDetails = styled.span`
  display: flex;
  gap: 4px;
  align-items: center;
`;

const IconDiv = styled.div`
  background-color: white;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 5em;
  height: 5em;
  cursor: pointer;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);

  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;

  &:hover {
    transform: scale(1.05);
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.2);
  }

  &:active {
    transform: scale(0.95);
    background-color: #f0f0f0;
  }
`;

const { ContextMenu } = VM.require("efiz.near/widget/Module.ContextMenu");

ContextMenu = ContextMenu || (() => <></>);

function deleteFile(path) {
  function buildObjectWithLastNull(path) {
    const parts = path.split("/").slice(1); // Remove the first part of the path
    let currentObj = {};
    let pointer = currentObj;

    parts.forEach((component, i) => {
      if (i === parts.length - 1) {
        pointer[component] = null;
      } else {
        pointer[component] = {};
        pointer = pointer[component];
      }
    });

    return currentObj;
  }

  const result = buildObjectWithLastNull(path);
  Social.set(result);
}

function deleteFolder(path, data) {
  function setLeavesToNull(obj) {
    Object.keys(obj).forEach((key) => {
      if (typeof obj[key] === "object" && obj[key] !== null) {
        obj[key] = setLeavesToNull(obj[key]);
      } else {
        obj[key] = null;
      }
    });
    return obj;
  }

  function buildObjectWithPath(path, data) {
    const parts = path.split("/").slice(1);
    const value = parts.reduce(
      (current, part) => (current && current[part] ? current[part] : undefined),
      data
    );
    let currentObj = {};
    let pointer = currentObj;

    parts.forEach((component, i) => {
      if (i === parts.length - 1) {
        pointer[component] = setLeavesToNull(value);
      } else {
        pointer[component] = {};
        pointer = pointer[component];
      }
    });
    return currentObj;
  }

  const newData = buildObjectWithPath(path, data);
  Social.set(newData);
}

function calculateSize(data) {
  const str = typeof data === "object" ? JSON.stringify(data) : data;
  let sizeInBytes = 0;

  for (let i = 0; i < str.length; i++) {
    const charCode = str.charCodeAt(i);
    if (charCode <= 0x7f) {
      sizeInBytes += 1;
    } else if (charCode <= 0x7ff) {
      sizeInBytes += 2;
    } else if (charCode <= 0xffff) {
      sizeInBytes += 3;
    } else {
      sizeInBytes += 4;
    }
  }

  if (sizeInBytes < 1024) {
    return sizeInBytes + " Bytes";
  } else if (sizeInBytes < 1024 * 1024) {
    return (sizeInBytes / 1024).toFixed(2) + " KB";
  } else {
    return (sizeInBytes / (1024 * 1024)).toFixed(2) + " MB";
  }
}

function determineType(path, data) {
  const parts = path.split("/");
  if (parts.length === 1) {
    return "account";
  } else {
    const v = parts[1];
    return v;
  }
}

const iconMap = {
  nametag: "bi bi-person-badge",
  profile: "bi bi-person-circle",
  index: "bi bi-list-ol",
  graph: "bi bi-graph-up",
  widget: "bi bi-layout-text-sidebar-reverse",
  post: "bi bi-file-post",
  thing: "bi bi-box",
  type: "bi bi-type",
  settings: "bi bi-gear",
};

const handleColumnClick = (key) => {
  setActivePath([...state.activePath, key]);
};

function RenderData({ data, layout }) {
  switch (layout) {
    case "LIST":
      const dataList =
        state.activePath.length === 0 ? data : getNestedData(data, activePath);

      return (
        <>
          {Object.keys(dataList).map((key) => (
            <div key={key}>
              <Widget
                src="fastvault.near/widget/voyager.item"
                loading={<></>}
                props={{
                  path: key,
                  data: dataList[key],
                  level: 0,
                  eFile: ({ key, data, level }) => {
                    const updatedPath = [path, key].join("/");
                    return (
                      <ContextMenu
                        Item={() => (
                          // TODO: Honestly, eFile and eFolder should be the same component.
                          <ItemContainer
                            onDoubleClick={() => setPath(updatedPath)} // open file
                            onClick={() => {
                              if (data.filetype.includes('text')) {
                              console.log("clicked file ln 325", data)
                              data.key = key;
                              State.update({ dataToDisplay: data });
                              } 
                            }}
                            style={{
                              marginLeft: level * 20,
                              backgroundColor:
                                selectedPath === updatedPath
                                  ? "#f0f0f0"
                                  : "transparent",
                            }}
                          >
                            <ItemDetails>
                              <i className="bi bi-file"></i>  
                              <span>{key.split("/").pop()}</span>
                            </ItemDetails>
                            <ItemInfo>
                              <span>{formatBytes(data.byteSize)}</span>
                              {/* ^^TODO */}
                              <span>{data.filetype}</span>
                              <span />
                            </ItemInfo>
                          </ItemContainer>
                        )}
                        passProps={{
                          delete: { path: updatedPath, data },
                        }}
                        handlers={{
                          delete: ({ path }) => {
                            deleteFile(path);
                          },
                        }}
                        items={{
                          delete: () => (
                            <>
                              <i className="menu__item__icon bi bi-x-lg" />
                              Delete
                            </>
                          ),
                        }}
                      />
                    );
                  },
                  eFolder: ({ toggleExpand, isExpanded, key, level }) => {
                    const updatedPath = [path, key].join("/");
                    return (
                      <ContextMenu
                        Item={() => (
                          <ItemContainer
                            onDoubleClick={() => setPath(updatedPath)} // open folder
                            onClick={() => {
                              toggleExpand();
                            }}
                            style={{
                              marginLeft: level * 20,
                            }}
                          >
                            <ItemDetails>
                              <ArrowIcon isExpanded={isExpanded} />
                              <i className="bi bi-folder"></i>
                              <span>{key.split("/").pop()}</span>{" "}
                            </ItemDetails>
                            <ItemInfo>
                              <span>--</span>
                              <span>Folder</span>
                              <span />
                            </ItemInfo>
                          </ItemContainer>
                        )}
                        passProps={{
                          delete: { path: updatedPath, data },
                        }}
                        handlers={{
                          delete: ({ path, data }) => {
                            // TODO: This is broken, I think because of the adjusted data object.
                            deleteFolder(path, data);
                          },
                        }}
                        items={{
                          delete: () => (
                            <>
                              <i className="menu__item__icon bi bi-x-lg" />
                              Delete
                            </>
                          ),
                        }}
                      />
                    );
                  },
                }}
              />
            </div>
          ))}
        </>
      );

    case "GRID":
      return password ? (
        <Grid>
          {Object.keys(data).map((key) => {
            const updatedPath = [path, key].join("/");
            return (
              <GridItem key={key}>
                <Widget
                  src="fastvault.near/widget/EncryptedImage"
                  props={{
                    password: password,
                    image: { ipfs_cid: data[key].cid },
                    style: { height: "200px", width: "200px" },
                    fallbackUrl:
                      "https://ipfs.near.social/ipfs/bafkreihdxorcz6wflgfhrwtguibaf6pbizp7mpavkwuhqxniaqloq3f2ae",
                  }}
                />
                <p>{key}</p>
              </GridItem>
            );
          })}
        </Grid>
      ) : (
        <p>Password was not provided</p>
      );

    default:
      return null;
  }
}

function getNestedData(data, pathArray) {
  return pathArray.reduce((currentData, key) => currentData[key] || {}, data);
}

// --- FV START ---
// https://stackoverflow.com/questions/15900485/correct-way-to-convert-size-in-bytes-to-kb-mb-gb-in-javascript
function formatBytes(bytes) {
  const decimals = 2;
  if (!bytes) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = [
    "Bytes",
    "KiB",
    "MiB",
    "GiB",
    "TiB",
    "PiB",
    "EiB",
    "ZiB",
    "YiB",
  ];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}
// --- FV END ---

return (
  <Content>
    <RenderData layout={layout} data={data} />
    {showPreview && (
      <Overlay>
        <div key={selectedPath}>
          <p>lol it's way to slow to allow preview rn</p>
        </div>
      </Overlay>
    )}
          <Widget
            src="near/widget/DIG.Dialog"
            props={{
              type: "dialog",
              open: !!state.dataToDisplay,
              confirmButtonText: "Close",
              actionButtons: <></>,
              content: <Widget
              src="fastvault.near/widget/EncryptedText"
              props={{
                password: password,
                cid: state.dataToDisplay?.cid,
                fileType: state.dataToDisplay?.filetype,
                key: state.dataToDisplay?.key,
              }}
               />,
              onOpenChange: (value) => State.update({ dataToDisplay: null }),
            }}
          />
  </Content>
);
