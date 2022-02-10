import { useState } from "react";
import { Box, Tabs, Button, Tab, makeStyles, Typography, IconButton } from "@material-ui/core";
import PublishIcon from "@material-ui/icons/Publish";
import ChevronLeftIcon from "@material-ui/icons/ChevronLeft";
import GitHubIcon from "@material-ui/icons/GitHub";
import { useParams, useHistory } from "react-router";
import { Link } from "react-router-dom";
import { useTemplates } from "../../context/TemplatesProvider";
import MonacoEditor from "react-monaco-editor";
import ReactMarkdown from "react-markdown";
import { UrlService } from "../../shared/utils/urlUtils";

const useStyles = makeStyles((theme) => ({
  root: {
    padding: "1rem",
    "& img": {
      maxWidth: "100%"
    }
  },
  title: {
    fontSize: "2rem",
    fontWeight: "bold"
  },
  titleContainer: {
    display: "flex"
  },
  deployBtn: {
    marginLeft: "auto"
  }
}));

export function TemplateDetails(props) {
  const [activeTab, setActiveTab] = useState("README");
  const { templatePath } = useParams();
  const { isLoading, getTemplateByPath } = useTemplates();
  const history = useHistory();

  const template = getTemplateByPath(templatePath);

  const classes = useStyles();

  const monacoOptions = {
    selectOnLineNumbers: true,
    scrollBeyondLastLine: false,
    minimap: {
      enabled: false
    }
  };

  function handleBackClick() {
    history.push(UrlService.templates());
  }

  function handleOpenGithub() {
    window.electron.openUrl(template.githubUrl);
  }

  return (
    <Box className={classes.root}>
      <Box className={classes.titleContainer}>
        <Box display="flex" alignItems="center">
          <IconButton aria-label="back" onClick={handleBackClick}>
            <ChevronLeftIcon />
          </IconButton>
          <Typography variant="h3" className={classes.title}>
            {template.name}
          </Typography>

          <Box marginLeft="0.5rem">
            <IconButton aria-label="View on github" title="View on Github" onClick={handleOpenGithub}>
              <GitHubIcon />
            </IconButton>
          </Box>
        </Box>

        <Button
          className={classes.deployBtn}
          variant="contained"
          size="medium"
          color="primary"
          component={Link}
          to={UrlService.createDeploymentFromTemplate(template.path)}
        >
          <PublishIcon />
          &nbsp;Deploy
        </Button>
      </Box>
      <Box>
        <Tabs value={activeTab} onChange={(ev, value) => setActiveTab(value)} indicatorColor="primary" textColor="primary">
          <Tab value="README" label="README" />
          <Tab value="SDL" label="SDL" />
          {template.guide && <Tab value="GUIDE" label="GUIDE" />}
        </Tabs>
      </Box>
      <Box paddingTop={2}>
        {activeTab === "README" && <ReactMarkdown linkTarget="_blank">{template.readme}</ReactMarkdown>}
        {activeTab === "SDL" && <MonacoEditor height="600" language="yaml" theme="vs-dark" value={template.deploy} options={monacoOptions} />}
        {activeTab === "GUIDE" && <ReactMarkdown linkTarget="_blank">{template.guide}</ReactMarkdown>}
      </Box>
    </Box>
  );
}
