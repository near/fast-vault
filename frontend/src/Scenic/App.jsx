const Wrapper = styled.div`
  > div {
    display: flex;
    flex-wrap: wrap;
  }
`;

const Modal = styled.div`
  width: 100%;
  height: 85vh;
  max-width: 500px;
  display: block;
`;

const [showPasswordModal, setShowPasswordModal] = useState(() => true);
const [password, setPassword] = useState(() => {});

return (
  <>
    {showPasswordModal && (
      <Modal>
        <Widget
          src="fastvault.near/widget/PasswordModal"
          props={{
            onClickConfirm: (password) => {
              setPassword(password);
              setShowPasswordModal(false);
            },
            onClickCancel: () => {
              setShowPasswordModal(false);
            },
          }}
        />
      </Modal>
    )}
    <Wrapper>
      {password && (
        <Widget
          src="fastvault.near/widget/Scenic.Feed"
          props={{
            password,
          }}
        />
      )}
      {!showPasswordModal && !password && (
        <Widget
          src="near/widget/DIG.Button"
          props={{ label: "Enter password to authorize photo access" }}
          onClick={() => {
            setShowPasswordModal(true);
          }}
        />
      )}
    </Wrapper>
  </>
);
