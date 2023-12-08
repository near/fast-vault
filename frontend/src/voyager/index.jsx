const Container = styled.div`
  display: flex;
  height: 100vh;
  width: 100%;
`;

const MainContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

function Header({ path, goBack, goForward, setLayout, togglePreview }) {
  return (
    <Widget
      src="fastvault.near/widget/voyager.header.index"
      props={{
        path,
        goBack,
        goForward,
        setLayout,
        togglePreview,
      }}
    />
  );
}

function Content({
  layout,
  path,
  setPath,
  setFilesSource,
  showPreview,
  selectedPath,
  setSelectedPath,
  password,
}) {
  return (
    <Widget
      src="fastvault.near/widget/voyager.content.index"
      props={{
        layout,
        path,
        setPath,
        setFilesSource,
        showPreview,
        selectedPath,
        setSelectedPath,
        password,
      }}
    />
  );
}

function Sidebar({ setPath, setFilesSource, setHistory }) {
  return (
    <Widget
      src="fastvault.near/widget/voyager.sidebar.index"
      props={{
        path,
        setPath,
        setFilesSource,
        setHistory,
      }}
    />
  );
}

return (
  <Widget
    src="fastvault.near/widget/voyager.provider"
    props={{
      path: props.path,
      password: props.password,
      setFilesSource: props.setFilesSource,
      Children: (p) => (
        <Container>
          <Sidebar {...p} />
          <MainContent>
            <Header {...p} />
            <Content {...p} />
          </MainContent>
        </Container>
      ),
    }}
  />
);
