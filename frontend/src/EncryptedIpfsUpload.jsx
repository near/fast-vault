const buttonText = props.buttonText || "Upload a file";
const ipfsUrl = props.ipfsUrl ?? "https://ipfs.near.social/add";

// Optional: will load from local storage or recover from account id and password.
const encryptSk = props.encryptSk;

// Required to pass in.
const password = props.password;

if (!password) {
  return <> "props.password is required for EncryptedIpfsUpload" </>;
}

const onUpload =
  props.onUpload ??
  ((filename, cid) => {
    if (props.debug) {
      console.log(
        `uploaded encrypted file=${filename} to ipfs with cid=${cid}`
      );
    }
  });

initState({
  uploading: false,
  files: [],
});

const str2array = (str) => {
  return new Uint8Array(Array.from(str).map((letter) => letter.charCodeAt(0)));
};

const recover_sk = () => {
  const hashed_id = nacl.hash(str2array(context.accountId));
  const hashed_pw = nacl.hash(str2array(password));
  const sk = new Uint8Array(nacl.secretbox.keyLength);
  for (var i = 0; i < hashed_id.length; i++) {
    const sk_i = i % sk.length;
    if (i >= sk.length) {
      sk[sk_i] = sk[sk_i] + (hashed_id[i] + hashed_pw[i]);
    } else {
      sk[sk_i] = hashed_id[i] + hashed_pw[i];
    }
  }
  return sk;
};

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
  const sk = recover_sk();
  console.log("created a new secret key to be set to local storage");
  Storage.privateSet("storage_secret", sk);
  return sk;
});

const new_nonce = (message) => {
  const encoded = nacl.hash(message);
  const nonce = new Uint8Array(nacl.secretbox.nonceLength);
  for (var i = 0; i < nonce.length; i++) {
    if (i >= encoded.length) {
      nonce[i] = i & 0xff;
    } else {
      nonce[i] = i & encoded[i];
    }
  }
  return nonce;
};

const encrypt = (message) => {
  const nonce = new_nonce(message);
  const sealed = nacl.secretbox(message, nonce, storageSk);
  return [nonce, sealed];
};

const onFilesChange = (files) => {
  State.update({
    uploading: true,
    files: [],
  });
  if (files?.length > 0) {
    files.map((file, index) => {
      const reader = new FileReader();
      reader.onload = (_) => {
        const buf = new Uint8Array(reader.result);
        const [nonce, ciphertext] = encrypt(buf);
        const body = JSON.stringify({
          name: file.name,
          // convert uint8array to Array since stringify does weird formatting.
          nonce: Array.from(nonce),
          ciphertext: Array.from(ciphertext),
        });

        // Upload to IPFS
        asyncFetch(ipfsUrl, {
          method: "POST",
          headers: {
            Accept: "application/json",
          },
          body,
        }).then((res) => {
          const cid = res.body.cid;
          State.update({
            files: [...state.files, { index, name: file.name, cid, nonce }],
          });

          if (onUpload) {
            onUpload(file.name, cid);
          }
        });

        State.update({ uploading: false });
        if (props.update) {
          props.update(state.files);
        }
      };
      reader.readAsArrayBuffer(file);
    });
  } else {
    State.update({
      uploading: false,
      files: null,
    });
  }
};

return (
  <div className="d-inline-block">
    <Files
      multiple={true}
      minFileSize={1}
      clickable
      className="btn btn-outline-primary"
      onChange={onFilesChange}
    >
      {state.uploading
        ? "Uploading"
        : state.files.length > 0
        ? "Replace All"
        : buttonText}
    </Files>
    {props.debug && (
      <div>
        <p>Debug Data:</p>
        <pre>{JSON.stringify(state, undefined, 2)}</pre>
      </div>
    )}
  </div>
);
