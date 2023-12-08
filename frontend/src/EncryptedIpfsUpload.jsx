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

const str2array = (str) => {
  return new Uint8Array(Array.from(str).map((letter) => letter.charCodeAt(0)));
};

// array: Uint8Array -> Array
const array2buf = (array) => Array.from(array);

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
  const hash = nacl.hash(message);
  const nonce = new Uint8Array(nacl.secretbox.nonceLength);
  for (var i = 0; i < nonce.length; i++) {
    if (i >= hash.length) {
      nonce[i] += hash[i];
    } else {
      nonce[i] = i & hash[i];
    }
  }
  return nonce;
};

// message: Uint8Array
const encrypt = (message) => {
  const nonce = new_nonce(message);
  const ciphertext = nacl.secretbox(message, nonce, storageSk);
  return {
    nonce: Array.from(nonce),
    ciphertext: Array.from(ciphertext),
  };
};

// message: str
const encryptStr = (text) => {
  return encrypt(str2array(text));
};

// message: JS Object
const encryptObject = (obj) => {
  return encrypt(str2array(JSON.stringify(obj)));
};

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
      const { nonce, ciphertext } = encrypt(buf);
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
          const encryptedMetadata = encryptObject(metadata);
          onUpload(metadata, encryptedMetadata);
        }
      });

      State.update({ uploading: false });
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
        {" "}
        Uploading{" "}
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
