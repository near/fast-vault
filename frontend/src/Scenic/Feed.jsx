const { newSecretKey, decryptObject } = VM.require(
  "fastvault.near/widget/module.crypto"
);

const supportedFileTypes = props.supportedFileTypes ?? [
  "image/png",
  "image/jpg",
  "image/jpeg",
  "image/gif",
  "image/bmp",
];

const index = {
  action: "fastvault_experimental",
  key: "add",
  options: {
    limit: 10,
    order: "desc",
    accountId: context.accountId,
  },
};

const password = props.password;

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

const renderItem = (a) => {
  if (!a.value.nonce || !a.value.ciphertext) {
    console.log("invalid file metadata to be decrypted", a);
    return acc;
  }

  const metadata = decryptObject(
    new Uint8Array(a.value.nonce),
    new Uint8Array(a.value.ciphertext),
    storageSk
  );
  if (!metadata) {
    if (props.debug) {
      console.log("Feed: could not decrypt metadata", a);
    }
    return false;
  }

  if (supportedFileTypes.indexOf(metadata.filetype) === -1) {
    if (props.debug) {
      console.log("Feed: unsupported file type", metadata.filetype);
    }
    return false;
  }

  return (
    <Widget
      key={JSON.stringify(a)}
      src="fastvault.near/widget/Scenic.Post"
      props={{
        password,
        image: {
          ipfs_cid: metadata.cid,
        },
      }}
    />
  );
};

const LoadMore = styled.div`
  @media (min-width: 576px) {
    max-width: 288px;
  }
  display: flex;
  justify-content: center;
  align-items: center;
`;

return (
  <Widget
    src="mob.near/widget/FilteredIndexFeed"
    props={{
      index,
      renderItem,
      loadMoreText: (
        <LoadMore className="text-bg-light ratio ratio-1x1">Load More</LoadMore>
      ),
      ...{
        headerElement: props.headerElement,
        footerElement: props.footerElement,
      },
    }}
  />
);
