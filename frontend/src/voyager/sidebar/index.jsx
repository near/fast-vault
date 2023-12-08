const Sidebar = styled.div`
  width: 250px;
  background-color: #f7f7f7;
  border-right: 1px solid #e0e0e0;
  padding: 20px;
`;

const Button = styled.button`
  display: block;
  width: 100%;
  text-align: left;
  padding: 10px 15px;
  border-radius: 4px;
  background-color: transparent;
  cursor: pointer;
  transition: background-color 0.3s;
  margin-bottom: 10px;

  &:hover {
    background-color: #e0e0e0;
  }
`;

const setPath = props.setPath || (() => { });

const setFilesSource = props.setFilesSource || (() => {
  console.log("No file source handler")
});

return (
  <Sidebar>
    <Button onClick={() => {
      setFilesSource("BOS_IPFS");
      setPath(`${context.accountId}/bos_ipfs`)
    }}>
      BOS IPFS
    </Button>
    <Button onClick={() => {
      setFilesSource("NEAR_FS");
      setPath(`${context.accountId}/near_fs`)
    }}>
      NEAR FS
    </Button>
  </Sidebar>
);
