/* Image component that allows to show encrypted images, given a password. */

const image = props.image;
const className = props.className;
const style = props.style;
const alt = props.alt ?? "Not set";
const fallbackUrl = props.fallbackUrl;
const determineFileType = props.determineFileType;
const fileType = props.fileType;
const ipfsUrl =
  props.ipfsUrl ?? ((cid) => `https://ipfs.near.social/ipfs/${cid}`);

// Optional: will load from local storage or recover from account id and password.
const decryptSk = props.decryptSk;

/// Required to pass in.
const password = props.password;

if (!password) {
  return <> "props.password is required for EncryptedImage" </>;
}

State.init({
  image,
});

const thumb = (imageUrl) =>
  thumbnail && imageUrl && !imageUrl.startsWith("data:image/")
    ? `https://i.near.social/${thumbnail}/${imageUrl}`
    : imageUrl;

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
  const sk = recover_sk();
  console.log("recovered decryption sk to local storage");
  Storage.privateSet("storage_secret", sk);
  return sk;
});

const decrypt = (nonce, sealed) => {
  return nacl.secretbox.open(sealed, nonce, storageSk);
};

const check = (headers) => {
  return (buffers) =>
    headers.every((header, index) => header === buffers[index]);
};

// Only define common image types. User can supply their own determine filetype check if they want.
const isPng = check([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const isJpg = check([0xff, 0xd8, 0xff]);
const isGif = check([0x47, 0x49, 0x46, 0x38]);
const isBmp = check([0x42, 0x4d]);

const getFileType =
  determineFileType ??
  ((u8buf) => {
    if (isPng(u8buf)) {
      return "png";
    }
    if (isJpg(u8buf)) {
      return "jpg";
    }
    if (isGif(u8buf)) {
      return "gif";
    }
    if (isBmp(u8buf)) {
      return "bmp";
    }
  });

function fetchImage(cid) {
  asyncFetch(ipfsUrl(cid)).then((file) => {
    if (!file.ok) {
      console.log("IPFS fetch not ok", file);
      return;
    }

    const ciphertext = new Uint8Array(file.body.ciphertext);
    const nonce = new Uint8Array(file.body.nonce);
    const bytes = decrypt(nonce, ciphertext);

    if (bytes) {
      const fileType = fileType ?? `image/${getFileType(bytes)}`;
      State.update({
        imageUrl: URL.createObjectURL(new Blob([bytes], { type: fileType })),
      });
    } else {
      console.log(`could not decrypt '${file.body.name}'`);
    }
  });
}

useEffect(() => {
  if (image.ipfs_cid) {
    fetchImage(image.ipfs_cid);
  }
}, [image]);

return (
  <img
    className={className}
    style={style}
    src={state.imageUrl ?? thumb(fallbackUrl)}
    alt={alt}
    onError={() => {
      if (state.imageUrl !== fallbackUrl) {
        State.update({
          imageUrl: fallbackUrl,
        });
      }
    }}
  />
);
