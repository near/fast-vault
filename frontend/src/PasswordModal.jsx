const ModalWrapper = styled.div`
  position: absolute;
  z-index: 1000;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;

  background: #000000aa;

  display: flex;
  justify-content: center;
  align-items: center;
`;

const ModalContent = styled.div`
  width: 530px;
  padding: 30px;
  border-radius: 20px;
  background: #090723;

  color: white;
`;

const ModalTitle = styled.div`
  font-size: 18px;
  font-weight: bold;
`;

const ModalSubTitle = styled.div`
  margin-top: 24px;
  margin-bottom: 20px;
  font-size: 14px;
`;

const ButtonGroup = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
`;

const Hr = styled.hr`
  background: #6a74f8;
  border: 0;
  height: 1px;
  margin-top: 16px;
  margin-bottom: 8px;
`;

const Input = styled.input`
  border-radius: 6px;
  padding: 16px 24px;

  font-size: 16px;
  display: flex;
  margin-bottom: 20px;
`;

return (
  <ModalWrapper>
    <ModalContent>
      <ModalTitle></ModalTitle>
      <ModalSubTitle>
        This application is requesting read storage access to your FastVault
        account. Enter your FastVault password to continue using this
        application.
      </ModalSubTitle>
      <Input
        type="password"
        className="form-control"
        placeholder="password"
        onChange={(e) => State.update({ formPassword: e.target.value })}
      />
      <ButtonGroup>
        <Widget
          src={`linearprotocol.near/widget/LiNEAR.Element.Button`}
          props={{
            onClick: () => props.onClickConfirm(state.formPassword),
            text: "Confirm",
          }}
        />
        <Widget
          src={`linearprotocol.near/widget/LiNEAR.Element.Button`}
          props={{
            onClick: props.onClickCancel,
            text: "Cancel",
            type: "outline",
          }}
        />
      </ButtonGroup>
      <Hr />
    </ModalContent>
  </ModalWrapper>
);
