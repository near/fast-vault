const accountId = props.accountId ?? context.accountId;

const savedPassword = Storage.privateGet("encryptionPassword");
if (savedPassword && !state.ipfsCreds) {
  State.update({ password: JSON.parse(savedPassword) });
}

State.init({
  uploading: false,
  dialogIsOpen: false,
});

/**
 * Write event to SocialDB that a file was added
 * @param {string} name
 * @param {string} cid
 */
const writeAddToIndex = (encryptedMetadata) => {
  Social.set(
    {
      index: {
        fastvault_experimental: JSON.stringify({
          key: "add",
          // encryptedMetadata is of the form { nonce, ciphertext },
          value: encryptedMetadata,
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

const disclaimer =
  "This is a hackathon project. Please do not upload large amounts of data or any sensitive information";
const DisclaimerBanner = styled.div`
  height: 2rem;
  width: 100%;
  background-color: #ffe484;
  color: #21252a;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
  border-radius: 0.5rem;
`;

// Show setup form if user has not entered IPFS credentials
if (!state.password) {
  return (
    <>
      <DisclaimerBanner>{disclaimer}</DisclaimerBanner>
      <div className="d-flex flex-column gap-1">
        <h2>Please enter encryption password</h2>
        <p>
          This will be used to encrypt future files and to attempt to decrypt
          existing files.
          <strong>
            Changing this will not affect the encryption of previously uploaded
            files
          </strong>
        </p>
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
    </>
  );
}

return accountId ? (
  <div>
    <DisclaimerBanner>{disclaimer}</DisclaimerBanner>
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
      {state.password && (
        <Widget
          src="fastvault.near/widget/EncryptedIpfsUpload"
          props={{
            password: state.password,
            onUpload: (_metadata, encryptedMetadata) => {
              writeAddToIndex(encryptedMetadata);
            },
          }}
        />
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
      <Widget
        src="fastvault.near/widget/voyager.index"
        props={{
          password: state.password,
        }}
      />
    </div>
  </div>
) : (
  <div>You must log-in in order to use the app</div>
);
