import { useEffect, forwardRef, useCallback, useRef } from "react";
import { Box, makeStyles, Button, Typography, CircularProgress, CardContent, Card, CardActions, IconButton } from "@material-ui/core";
import { SnackbarContent, useSnackbar } from "notistack";
import CloseIcon from "@material-ui/icons/Close";
import { LinkTo } from "../../shared/components/LinkTo";

const ipcApi = window.electron.api;

const useStyles = makeStyles((theme) => ({
  root: {},
  card: {
    backgroundColor: theme.palette.info.main,
    width: "100%"
  },
  typography: {
    fontWeight: "bold",
    color: theme.palette.primary.contrastText
  },
  actionRoot: {
    padding: "8px 8px 8px 16px",
    justifyContent: "space-between"
  },
  icons: {
    marginLeft: "auto"
  },
  actionButton: {
    color: theme.palette.primary.contrastText
  },
  white: {
    color: theme.palette.common.white
  }
}));

export const AutoUpdater = () => {
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();
  const newUpdateSnackbarKey = useRef(null);
  const downloadSnackbarKey = useRef(null);
  const intervalUpdateCheck = useRef(null);
  const classes = useStyles();

  useEffect(() => {
    ipcApi.receive("update_available", (event) => {
      ipcApi.removeAllListeners("update_available");

      console.log("Update available", event);

      showNewUpdateSnackbar(event.releaseNotes, event.releaseName, event.releaseDate);
    });
    ipcApi.receive("update_downloaded", (event) => {
      ipcApi.removeAllListeners("update_downloaded");

      console.log("Update downloaded:", event);

      showUpdateDownloadedSnackbar(event.releaseNotes, event.releaseName, event.releaseDate);
    });

    ipcApi.send("check_update");

    // Check for udpates every 30 seconds
    intervalUpdateCheck.current = setInterval(() => {
      ipcApi.send("check_update");
    }, 60000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * 1.
   * Show snackbar when there's a new update to download
   */
  const showNewUpdateSnackbar = (releaseNotes, releaseName, releaseDate) => {
    // Cancel the interval
    clearInterval(intervalUpdateCheck.current);

    const key = enqueueSnackbar(
      <div>
        <Box marginBottom={1}>
          <strong>A new update {releaseName} is available!</strong> Download now?
        </Box>
        <Box marginBottom="1rem">
          <LinkTo className={classes.white} onClick={() => window.electron.openUrl("https://github.com/Akashlytics/akashlytics-deploy/releases")}>
            View release notes
          </LinkTo>
        </Box>
        <Button
          size="small"
          variant="contained"
          onClick={() => {
            ipcApi.send("download_update");
            closeSnackbar(key);

            newUpdateSnackbarKey.current = null;
            showDownloadingUpdateSnackbar();
          }}
        >
          Download
        </Button>
      </div>,
      {
        variant: "info",
        autoHideDuration: null
      }
    );

    newUpdateSnackbarKey.current = key;
  };

  /**
   * 2.
   * Show snackbar when downloading the update
   */
  const showDownloadingUpdateSnackbar = () => {
    const key = enqueueSnackbar("Downloading new update...", {
      variant: "info",
      content: (key, message) => <DownloadingUpdate id={key} message={message} />,
      autoHideDuration: null // Wait for download to finish
    });

    downloadSnackbarKey.current = key;
  };

  /**
   * 3.
   * Show snackbar when the update is downloaded
   */
  const showUpdateDownloadedSnackbar = (releaseNotes, releaseName, releaseDate) => {
    console.log("Release info", releaseNotes, releaseName, releaseDate);

    closeSnackbar(downloadSnackbarKey.current);
    downloadSnackbarKey.current = null;
    newUpdateSnackbarKey.current = null;

    enqueueSnackbar(
      <div>
        <Box marginBottom=".5rem">
          <strong>Update {releaseName} Downloaded!</strong> It will be installed on restart.
          <br />
          <LinkTo className={classes.white} onClick={() => window.electron.openUrl("https://github.com/Akashlytics/akashlytics-deploy/releases")}>
            View release notes
          </LinkTo>
          <Typography variant="h6">Restart now?</Typography>
        </Box>
        <Button
          size="small"
          variant="contained"
          onClick={() => {
            ipcApi.send("restart_app");
          }}
        >
          Restart App
        </Button>
      </div>,
      {
        variant: "info",
        autoHideDuration: 5 * 60 * 1000 // 5 minutes
      }
    );
  };

  return null;
  // return (
  //   <>
  //     <Button onClick={showNewUpdateSnackbar}>Update available</Button>
  //     <Button onClick={showUpdateDownloadedSnackbar}>Update downloaded</Button>
  //     <Button onClick={showDownloadingUpdateSnackbar}>Downloading Update</Button>
  //     <Button
  //       onClick={() => {
  //         closeSnackbar(downloadSnackbarKey);
  //         downloadSnackbarKey.current = null;
  //         // setDownloadSnackbarKey(null);
  //       }}
  //     >
  //       Close snackbar
  //     </Button>
  //   </>
  // );
};

const DownloadingUpdate = forwardRef(({ message, id }, ref) => {
  const { closeSnackbar } = useSnackbar();
  const classes = useStyles();

  const handleDismiss = useCallback(() => {
    closeSnackbar(id);
  }, [id, closeSnackbar]);

  return (
    <SnackbarContent ref={ref} className={classes.root}>
      <Card className={classes.card}>
        <CardActions classes={{ root: classes.actionRoot }}>
          <Typography variant="subtitle2" className={classes.typography}>
            {message}
          </Typography>

          <div className={classes.icons}>
            <IconButton onClick={handleDismiss} className={classes.actionButton} size="small">
              <CloseIcon />
            </IconButton>
          </div>
        </CardActions>
        <CardContent className={classes.actionRoot}>
          <CircularProgress size="2rem" className={classes.white} />
        </CardContent>
      </Card>
    </SnackbarContent>
  );
});
