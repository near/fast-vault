const password = props.password;
const cid = props.cid;
const fileType = props.fileType;
const key = props.key;
const ipfsUrl =
  props.ipfsUrl ?? ((cid) => `https://ipfs.near.social/ipfs/${cid}`);

  console.log('props: ', props);
console.log('cid: ', cid);
console.log('password', password);

// Optional: will load from local storage or recover from account id and password.
const decryptSk = props.decryptSk;

if (!password) {
  return <> "props.password is required for EncryptedIpfsUpload" </>;
}

const { decrypt, newSecretKey } = VM.require(
  "fastvault.near/widget/module.crypto"
);

State.init({
  text,
  dialogOpen: false,
})

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
  console.log("recovered decryption key for local storage");
  Storage.privateSet("storage_secret", sk);
  return sk;
});

const fetchFile = (cid) => {
  console.log(`fetching file '${cid}'`);
  asyncFetch(ipfsUrl(cid)).then((file) => {
    if (!file.ok) {
      console.log("IPFS fetch not ok", file);
      return;
    }

    // Expect ciphertext and nonce to be Array type. Convert to Uint8Array.
    const ciphertext = new Uint8Array(file.body.ciphertext);
    const nonce = new Uint8Array(file.body.nonce);
    const bytes = decrypt(nonce, ciphertext, storageSk);

    if (bytes) {
      
      new Blob([bytes]).text().then((text) => {
        console.log('text: ', text)
        State.update({
          text,
        });
      });
      
    } else {
      console.log(`could not decrypt '${file.body.name}'`);
      State.update({
        imageUrl: unableToDecryptUrl,
      });
    }
  });
};

useEffect(() => {
  if (cid) {
    fetchFile(cid);
  }
},[cid]);

return(
  <>
  <h2>{key}</h2>
  <p>{state.text}</p>
  </>
)