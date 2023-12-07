const savedPassword = Storage.privateGet("encryptionPassword");
if (savedPassword && !state.ipfsCreds) {
  State.update({ password: JSON.parse(savedPassword) });
}

State.init({
  uploading: false,
  dialogIsOpen: false,
});

/**
 * TODO currently receiving 400 error, no access to use `FormData` in VM
 * @param {File} file
 */
const upload = (file) => {
  // const formData = new FormData();
  // formData.append("file", body);
  file.path = "abc";
  asyncFetch("https://ipfs.infura.io:5001/api/v0/add", {
    method: "POST",
    headers: {
      // Accept: "application/json",
      "Content-Type": file.type,
      Authorization:
        "Basic " +
        btoa(state.ipfsCreds.username + ":" + state.ipfsCreds.password),
    },
    body: file,
  }).then((res) => {
    console.log("res", res);
    State.update({ uploading: false });
    // const cid = res.body.cid;
    // State.update({ img: { cid } });

    // TODO on success, write to index
  });
};

/**
 * Write event to SocialDB that a file was added
 * @param {string} name
 * @param {string} cid
 */
const writeAddToIndex = (name, cid) => {
  Social.set(
    {
      index: {
        fastvault_experimental: JSON.stringify({
          key: "add",
          value: {
            name,
            cid,
          },
        }),
      },
    },
    {
      onCommit: () => {
        State.update({ uploading: false });
      },
    }
  );
};

/**
 * Kicks off file upload
 * @param {File[]} files limited to 1
 */
const filesOnChange = ([file]) => {
  console.log("typeof files", typeof files);
  console.log("file", file);
  if (file) {
    State.update({ uploading: true });

    // TODO encrypt file here before upload

    upload(file);
    // writeAddToIndex();
  }
};

/**
 * Convert file to Data URL which can be passed into img src attribute for display
 * @param {*} blob
 */
const setDataUrlFromBlob = (blob) => {
  const reader = new FileReader();
  reader.onloadend = () => {
    console.log("reader.result", reader.result);
    State.update({ dataUrl: reader.result, dialogIsOpen: true });
    // const base64data = reader.result.split(",")[1];
    // console.log("base64data", base64data);
  };
  reader.readAsDataURL(blob);
};

// Show setup form if user has not entered IPFS credentials
if (!state.password) {
  return (
    <div className="d-flex flex-column gap-1">
      <div>Please enter encryption password</div>
      <div className="d-flex flex-row gap-2">
        <input
          type="password"
          className="form-control"
          placeholder="password"
          onChange={(e) => State.update({ formPassword: e.target.value })}
        />
        <Widget
          src="near/widget/DIG.Button"
          props={{ label: "Save" }}
          onClick={() => {
            Storage.privateSet(
              "encryptionPassword",
              JSON.stringify(state.formPassword)
            );
            State.update({
              password: state.formPassword,
            });
          }}
        />
      </div>
    </div>
  );
}

return (
  <div className="d-flex flex-column gap-1">
    <div className="d-flex flex-row justify-content-end">
      <Widget
        src="near/widget/DIG.Button"
        props={{ label: "Switch encryption password" }}
        onClick={() => {
          Storage.privateSet("encryptionPassword", null);
          State.update({
            password: null,
          });
        }}
      />
    </div>
    {state.uploading ? (
      <div className="w-100" style={{ textAlign: "center" }}>
        {" "}
        Uploading{" "}
      </div>
    ) : (
      // <Files
      //   multiple={false}
      //   // accepts={["image/*"]}
      //   minFileSize={1}
      //   maxFileSize={500000000}
      //   clickable
      //   className="btn btn-outline-primary h-100 w-100 align-middle"
      //   onChange={filesOnChange}
      // >
      //   Upload a file
      // </Files>
      state.password && (
        <Widget
          src="fastvault.near/widget/EncryptedIpfsUpload"
          props={{
            password: state.password,
            onUpload: (fname, cid) => {
              writeAddToIndex(fname, cid);
            },
          }}
        />
      )
    )}
    {
      /* example of displaying an image in dialog */
      state.dataUrl && (
        <Widget
          src="near/widget/DIG.Dialog"
          props={{
            type: "dialog",
            // title: "Header",
            // description: "Some description",
            // onCancel: handleCancelFunction,
            // onConfirm: handleConfirmFunction,
            // cancelButtonText: "Cancel",
            // confirmButtonText: "Confirm",
            open: state.dialogIsOpen,
            content: <img src={state.dataUrl} />,
            onOpenChange: (value) => State.update({ dialogIsOpen: value }),
          }}
        />
      )
    }
    <Widget src="fastvault.near/widget/voyager.index" />
  </div>
);
