import React, { useEffect, useRef, useState } from "react";
import { useCertificate } from "../../context/CertificateProvider";
import { makeStyles, CircularProgress, Checkbox, FormControlLabel, FormGroup, Box, TextField, FormControl, InputAdornment, Button } from "@material-ui/core";
import { useProviders } from "../../queries";
import { Alert } from "@material-ui/lab";
import * as monaco from "monaco-editor";
import { monacoOptions } from "../../shared/constants";
import { ViewPanel } from "../../shared/components/ViewPanel";
import { LinearLoadingSkeleton } from "../../shared/components/LinearLoadingSkeleton";
import { useThrottledCallback } from "../../hooks/useThrottle";
import { useLeaseStatus } from "../../queries/useLeaseQuery";
import { useForm, Controller } from "react-hook-form";
import { ShellDownloadModal } from "./ShellDownloadModal";
import { LeaseSelect } from "./LeaseSelect";
import { MemoMonaco } from "../../shared/components/MemoMonaco";
import { ServiceSelect } from "./ServiceSelect";

// TODO Colors theme
const vsDark = "#1e1e1e";
const vsDarkFont = "#d4d4d4";

const useStyles = makeStyles((theme) => ({
  leaseSelector: {
    margin: theme.spacing(1)
  },
  root: {
    "& .MuiToggleButton-root": {
      color: "rgba(0, 0, 0, 0.54)",
      fontWeight: "bold",
      "&.Mui-selected": {
        color: "rgb(25, 118, 210)",
        backgroundColor: "rgba(25, 118, 210, 0.08)"
      }
    }
  },
  commandForm: {
    backgroundColor: vsDark,
    borderTop: `1px solid ${theme.palette.grey[800]}`
  },
  commandInputRoot: {
    "& fieldset": {
      border: "none",
      backgroundColor: vsDark
    }
  },
  commandInputBase: {
    borderRadius: 0,
    padding: 0
  },
  commandInput: {
    color: vsDarkFont,
    zIndex: 100
  },
  clearButtonContainer: {
    zIndex: 100
  },
  clearButton: {
    borderRadius: 0,
    height: "39px"
  }
}));

const _monacoOptions = {
  ...monacoOptions,
  inlineSuggest: {
    enable: false
  },
  quickSuggestions: false,
  acceptSuggestionOnEnter: "off",
  acceptSuggestionOnCommitCharacter: false,
  snippetSuggestions: "none",
  suggestOnTriggerCharacters: false,
  suggest: false,
  codeLens: false,
  readOnly: true,
  lineNumbers: false,
  colorDecorators: false
};

export function DeploymentLeaseShell({ leases }) {
  const classes = useStyles();
  const [canSetConnection, setCanSetConnection] = useState(false);
  const [isConnectionEstablished, setIsConnectionEstablished] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const formRef = useRef();
  const shell = useRef([]);
  const monacoRef = useRef();
  const commandRef = useRef();
  const [shellText, setShellText] = useState("");
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedLease, setSelectedLease] = useState(null);
  const [isDownloadingFile, setIsDownloadingFile] = useState(false);
  const [isShowingDownloadModal, setIsShowingDownloadModal] = useState(false);
  const { data: providers } = useProviders();
  const { localCert, isLocalCertMatching } = useCertificate();
  const providerInfo = providers?.find((p) => p.owner === selectedLease?.provider);
  const { refetch: getLeaseStatus, isFetching: isLoadingStatus } = useLeaseStatus(providerInfo?.host_uri, selectedLease || {}, {
    enabled: false,
    onSuccess: (leaseStatus) => {
      if (leaseStatus) {
        setServices(Object.keys(leaseStatus.services));
        // Set the first service as default
        setSelectedService(Object.keys(leaseStatus.services)[0]);

        setCanSetConnection(true);
      }
    }
  });
  const { handleSubmit, control, setValue } = useForm({
    defaultValues: {
      command: ""
    }
  });

  const updateShellText = useThrottledCallback(
    () => {
      const shellText = shell.current.map((x) => x).join("\n");
      setShellText(shellText);
      setIsLoadingData(false);

      const editor = monacoRef.current.editor;
      // Immediate scroll type, scroll to bottom
      editor.revealLine(editor.getModel().getLineCount(), 1);
      // Clear selection
      editor.setSelection(new monaco.Selection(0, 0, 0, 0));

      commandRef.current.focus();
    },
    [],
    1000
  );

  useEffect(() => {
    if (!leases || leases.length === 0) return;

    setSelectedLease(leases[0]);
  }, [leases]);

  useEffect(() => {
    if (!selectedLease || !providers || providers.length === 0) return;

    getLeaseStatus();
  }, [selectedLease, providers, getLeaseStatus]);

  useEffect(() => {
    if (!canSetConnection || !providers || !isLocalCertMatching || !selectedLease || !selectedService || isConnectionEstablished) return;

    shell.current = [];
    const url = `${providerInfo.host_uri}/lease/${selectedLease.dseq}/${selectedLease.gseq}/${selectedLease.oseq}/shell?stdin=0&tty=0&podIndex=0&cmd0=ls&service=${selectedService}`;
    setIsLoadingData(true);

    const socket = window.electron.openWebSocket(url, localCert.certPem, localCert.keyPem, (message) => {
      let parsedData = Buffer.from(message.data).toString("utf-8", 1);
      let jsonData, exitCode, errorMessage;
      try {
        jsonData = JSON.parse(parsedData);
        exitCode = jsonData["exit_code"];
        errorMessage = jsonData["message"];
      } catch (error) {}

      if (exitCode !== undefined) {
        if (errorMessage) {
          parsedData = `An error has occured: ${errorMessage}`;
        } else {
          parsedData = `// Connection established to service '${selectedService}'! ☁ 🚀 🌙\n// Type a command below like 'ls':`;
        }

        shell.current = shell.current.concat([parsedData]);

        updateShellText();

        setIsLoadingData(false);
        setIsConnectionEstablished(true);
      }
    });

    return () => {
      socket.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leases, providers, isLocalCertMatching, selectedLease, selectedService, localCert.certPem, localCert.keyPem, services?.length, isConnectionEstablished]);

  // On command submit
  const onSubmit = async ({ command }) => {
    if (!isConnectionEstablished || isLoadingData) return;

    const url = `${providerInfo.host_uri}/lease/${selectedLease.dseq}/${selectedLease.gseq}/${selectedLease.oseq}/shell?stdin=0&tty=0&podIndex=0${command
      .split(" ")
      .map((c, i) => `&cmd${i}=${encodeURIComponent(c.replace(" ", "+"))}`)
      .join("")}${`&service=${selectedService}`}`;

    shell.current = shell.current.concat([`\n// command: ${command}\n// ---------------------------`]);
    updateShellText();
    // Clear current command
    setValue("command", "");

    setIsLoadingData(true);
    const socket = window.electron.openWebSocket(url, localCert.certPem, localCert.keyPem, (message) => {
      let parsedData = Buffer.from(message.data)
        .toString("utf-8", 1)
        .replace(/^\n|\n$/g, "");

      let jsonData, exitCode, errorMessage;
      try {
        jsonData = JSON.parse(parsedData);
        exitCode = jsonData["exit_code"];
        errorMessage = jsonData["message"];
      } catch (error) {}

      if (exitCode !== undefined) {
        if (errorMessage) {
          parsedData = `An error has occured: ${errorMessage}`;
        } else {
          parsedData = "";
        }

        setIsLoadingData(false);

        socket.close();
      }

      if (parsedData) {
        shell.current = shell.current.concat([parsedData]);
        updateShellText();
      }
    });
  };

  function handleLeaseChange(id) {
    setSelectedLease(leases.find((x) => x.id === id));

    if (id !== selectedLease.id) {
      setShellText("");
      setIsLoadingData(true);
      setSelectedService(null);
      setCanSetConnection(false);
      setIsConnectionEstablished(false);
    }
  }

  const onSelectedServiceChange = (value) => {
    setSelectedService(value);

    if (value !== selectedService) {
      setShellText("");
      setIsConnectionEstablished(false);
    }
  };

  const onClearShell = () => {
    shell.current = [];
    updateShellText();
  };

  const onDownloadFileClick = async () => {
    setIsShowingDownloadModal(true);
  };

  const onCloseDownloadClick = () => {
    // setIsDownloadingFile(false);
    setIsShowingDownloadModal(false);
  };

  return (
    <div className={classes.root}>
      {isShowingDownloadModal && (
        <ShellDownloadModal
          onCloseClick={onCloseDownloadClick}
          selectedLease={selectedLease}
          localCert={localCert}
          providerInfo={providerInfo}
          selectedService={selectedService}
          isDownloadingFile={isDownloadingFile}
          setIsDownloadingFile={setIsDownloadingFile}
        />
      )}

      {isLocalCertMatching ? (
        <>
          {selectedLease && (
            <>
              <Box display="flex" alignItems="center" justifyContent="space-between" padding=".2rem .5rem" height="45px">
                <Box display="flex" alignItems="center">
                  {leases?.length > 1 && <LeaseSelect leases={leases} defaultValue={selectedLease.id} onSelectedChange={handleLeaseChange} />}

                  {services?.length > 0 && selectedService && (
                    <Box marginLeft={leases?.length > 1 ? ".5rem" : 0}>
                      <ServiceSelect services={services} defaultValue={selectedService} onSelectedChange={onSelectedServiceChange} />
                    </Box>
                  )}

                  {isLoadingStatus && (
                    <Box marginLeft="1rem">
                      <CircularProgress size="1rem" />
                    </Box>
                  )}
                </Box>

                <Box display="flex" alignItems="center">
                  {localCert && (
                    <div>
                      <Button
                        onClick={onDownloadFileClick}
                        variant="contained"
                        size="small"
                        color="primary"
                        disabled={isDownloadingFile || !isConnectionEstablished}
                      >
                        {isDownloadingFile ? <CircularProgress size="1.5rem" color="primary" /> : "Download file"}
                      </Button>
                    </div>
                  )}
                </Box>
              </Box>

              <LinearLoadingSkeleton isLoading={isLoadingData} />

              <ViewPanel bottomElementId="footer" overflow="hidden" offset={39}>
                <MemoMonaco value={shellText} monacoRef={monacoRef} options={_monacoOptions} />
              </ViewPanel>

              <div id="terminal-command">
                <form onSubmit={handleSubmit(onSubmit)} ref={formRef} className={classes.commandForm}>
                  <FormControl className={classes.commandInputRoot} fullWidth>
                    <Controller
                      control={control}
                      name="command"
                      render={({ field }) => {
                        return (
                          <TextField
                            {...field}
                            type="text"
                            variant="outlined"
                            autoFocus
                            placeholder="Type command"
                            fullWidth
                            InputProps={{
                              ref: commandRef,
                              classes: { input: classes.commandInput, root: classes.commandInputBase },
                              endAdornment: (
                                <InputAdornment position="end" className={classes.clearButtonContainer}>
                                  <Button
                                    size="small"
                                    onClick={() => onClearShell()}
                                    variant="contained"
                                    className={classes.clearButton}
                                    disabled={isLoadingData || !isConnectionEstablished}
                                  >
                                    Clear
                                  </Button>
                                </InputAdornment>
                              )
                            }}
                          />
                        );
                      }}
                    />
                  </FormControl>
                </form>
              </div>
            </>
          )}
        </>
      ) : (
        <Box mt={1}>
          <Alert severity="info">You need a valid certificate to view deployment logs.</Alert>
        </Box>
      )}
    </div>
  );
}
