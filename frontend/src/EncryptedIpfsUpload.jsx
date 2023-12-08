const buttonText = props.buttonText || "Upload a file";
const ipfsUrl = props.ipfsUrl ?? "https://ipfs.near.social/add";

// Headers for IPFS request.
const headers = props.headers ?? {
  Accept: "application/json",
};

// Optional: will load from local storage or recover from account id and password.
const encryptSk = props.encryptSk;

// Required to pass in.
const password = props.password;

if (!password) {
  return <> "props.password is required for EncryptedIpfsUpload" </>;
}

const { encrypt, encryptObject, newSecretKey } = VM.require(
  "fastvault.near/widget/module.crypto"
);

const onUpload =
  props.onUpload ??
  ((metadata, encryptedMetadata) => {
    if (props.debug) {
      console.log(
        `Uploaded metadata=${metadata}. Encrypted form can be decrypted w/ password: ${encryptedMetadata}`
      );
    }
  });

initState({
  uploading: false,
  files: [],
});

const [storageSk, _] = useState(() => {
  if (encryptSk) {
    // encryptSk is available. use it instead of recovering
    if (password) {
      console.log("Utilizing encryptSk over password");
    }
    return encryptSk;
  }
  const localSk = Storage.privateGet("storage_secret");
  if (localSk && !password) {
    return localSk;
  }
  const sk = newSecretKey(context.accountId, password);
  console.log("recovered encryption key for local storage");
  Storage.privateSet("storage_secret", sk);
  return sk;
});

/**
 * Kicks off file upload
 * @param {File[]} files limited to 1
 */
const filesOnChange = ([file]) => {
  console.log("file", file);
  State.update({
    uploading: true,
  });
  if (file) {
    const reader = new FileReader();
    reader.onload = (_) => {
      const buf = new Uint8Array(reader.result);
      const { nonce, ciphertext } = encrypt(buf, storageSk);
      const body = JSON.stringify({
        name: file.name,
        nonce,
        ciphertext,
      });

      // Upload to IPFS
      asyncFetch(ipfsUrl, {
        method: "POST",
        headers,
        body,
      }).then((res) => {
        if (onUpload) {
          const metadata = {
            filename: file.name,
            filetype: file.type,
            byteSize: ciphertext.length,
            cid: res.body.cid,
          };
          const encryptedMetadata = encryptObject(metadata, storageSk);
          onUpload(metadata, encryptedMetadata);
          State.update({ uploading: false });
        }
      });
    };
    reader.readAsArrayBuffer(file);
  } else {
    State.update({
      uploading: false,
    });
  }
};

return (
  <div className="d-inline-block">
    {state.uploading ? (
      <div className="w-100" style={{ textAlign: "center" }}>
        Uploading...
      </div>
    ) : (
      <Files
        multiple={false}
        // accepts={["image/*"]}
        minFileSize={1}
        maxFileSize={500000000}
        clickable
        className="btn btn-outline-primary h-100 w-100 align-middle"
        onChange={filesOnChange}
      >
        Upload a file
      </Files>
    )}
    {props.debug && (
      <div>
        <p>Debug Data:</p>
        <pre>{JSON.stringify(state, undefined, 2)}</pre>
      </div>
    )}
  </div>
);
