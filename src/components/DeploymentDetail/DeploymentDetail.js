import { useState, useEffect, useCallback } from "react";
import { apiEndpoint, rpcEndpoint } from "../../shared/constants";
import { MsgCloseDeployment } from "../../ProtoAkashTypes";
import { SigningStargateClient } from "@cosmjs/stargate";
import {
  customRegistry,
  baseFee,
  createFee,
} from "../../shared/utils/blockchainUtils";
import { useParams, useHistory } from "react-router-dom";
import MoreVertIcon from "@material-ui/icons/MoreVert";
import CancelPresentationIcon from "@material-ui/icons/CancelPresentation";
import ChevronLeftIcon from "@material-ui/icons/ChevronLeft";
import {
  Button,
  CircularProgress,
  MenuItem,
  Menu,
  IconButton,
  Card,
  CardContent,
  CardHeader,
  Typography,
  List,
  ListItem,
  ListItemText,
} from "@material-ui/core";
import { LeaseRow } from "../../LeaseRow";
import { useStyles } from "./DeploymentDetail.styles";
import { DeploymentSubHeader } from "./DeploymentSubHeader";

// Deployment
// cpuAmount: 1
// createdAt: 747596
// dseq: "747591"
// memoryAmount: 1073741824
// state: "active"
// storageAmount: 5368709120
// transferredAmount: "1202268"

export function DeploymentDetail(props) {
  const [bids, setBids] = useState([]);
  const [leases, setLeases] = useState([]);
  const [currentBlock, setCurrentBlock] = useState(null);
  const [isLoadingBids, setIsLoadingBids] = useState(false);
  const [isLoadingLeases, setIsLoadingLeases] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);

  const classes = useStyles();
  const history = useHistory();
  let { dseq } = useParams();

  const { address, selectedWallet } = props;
  const deployment = props.deployments.find((d) => d.dseq === dseq);

  const loadBids = useCallback(async () => {
    setIsLoadingBids(true);

    const response = await fetch(
      apiEndpoint +
        "/akash/market/v1beta1/bids/list?filters.owner=" +
        address +
        "&filters.dseq=" +
        deployment.dseq
    );
    const data = await response.json();

    setBids(
      data.bids.map((b) => ({
        owner: b.bid.bid_id.owner,
        provider: b.bid.bid_id.provider,
        dseq: b.bid.bid_id.dseq,
        gseq: b.bid.bid_id.gseq,
        oseq: b.bid.bid_id.oseq,
        price: b.bid.price,
        state: b.bid.state,
      }))
    );

    setIsLoadingBids(false);
  }, [address, deployment]);

  const loadLeases = useCallback(async () => {
    setIsLoadingLeases(true);
    const response = await fetch(
      apiEndpoint +
        "/akash/market/v1beta1/leases/list?filters.owner=" +
        address +
        "&filters.dseq=" +
        deployment.dseq
    );
    const data = await response.json();

    setLeases(
      data.leases.map((l) => ({
        id:
          l.lease.lease_id.dseq + l.lease.lease_id.gseq + l.lease.lease_id.oseq,
        owner: l.lease.lease_id.owner,
        provider: l.lease.lease_id.provider,
        dseq: l.lease.lease_id.dseq,
        gseq: l.lease.lease_id.gseq,
        oseq: l.lease.lease_id.oseq,
        state: l.lease.state,
        price: l.lease.price,
      }))
    );

    setIsLoadingLeases(false);
  }, [deployment, address]);

  const loadBlock = useCallback(async () => {
    // setIsLoadingLeases(true);
    const response = await fetch(`${apiEndpoint}/blocks/${deployment.dseq}`);
    const data = await response.json();

    setCurrentBlock(data);

    // setIsLoadingLeases(false);
  }, [deployment, address]);

  useEffect(() => {
    loadBids();
    loadLeases();
    loadBlock();
  }, [deployment, loadBids, loadLeases, loadBlock]);

  async function closeDeployment(deployment) {
    handleMenuClose();
    const client = await SigningStargateClient.connectWithSigner(
      rpcEndpoint,
      selectedWallet,
      {
        registry: customRegistry,
      }
    );

    const closeJson = {
      id: {
        owner: address,
        dseq: parseInt(deployment.dseq),
      },
    };

    const closeDeploymentJson = {
      typeUrl: "/akash.deployment.v1beta1.MsgCloseDeployment",
      value: closeJson,
    };

    const err = MsgCloseDeployment.verify(closeJson);

    if (err) throw err;

    await client.signAndBroadcast(
      address,
      [closeDeploymentJson],
      baseFee,
      "Test Akashlytics"
    );
  }

  async function acceptBid(bid) {
    const client = await SigningStargateClient.connectWithSigner(
      rpcEndpoint,
      selectedWallet,
      {
        registry: customRegistry,
      }
    );

    const createLeaseMsg = {
      typeUrl: "/akash.market.v1beta1.MsgCreateLease",
      value: {
        bid_id: {
          owner: bid.owner,
          dseq: bid.dseq,
          gseq: bid.gseq,
          oseq: bid.oseq,
          provider: bid.provider,
        },
      },
    };

    await client.signAndBroadcast(
      address,
      [createLeaseMsg],
      createFee("200000"),
      "Test Akashlytics"
    );

    loadBids();
    loadLeases();
  }

  function handleMenuClick(ev) {
    setAnchorEl(ev.currentTarget);
  }

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  function handleBackClick() {
    history.push("/");
  }

  return (
    <>
      <Card className={classes.root} variant="outlined">
        <CardHeader
          classes={{
            title: classes.cardTitle,
          }}
          action={
            <IconButton
              aria-label="settings"
              aria-haspopup="true"
              onClick={handleMenuClick}
            >
              <MoreVertIcon />
            </IconButton>
          }
          title={
            <>
              <IconButton aria-label="back" onClick={handleBackClick}>
                <ChevronLeftIcon />
              </IconButton>
              <Typography variant="h4" className={classes.title}>
                Deployment detail
              </Typography>
            </>
          }
          subheader={
            <DeploymentSubHeader
              deployment={deployment}
              block={currentBlock}
              deploymentCost={
                leases && leases.length > 0
                  ? leases.reduce(
                      (prev, current) => prev + current.price.amount,
                      []
                    )
                  : 0
              }
            />
          }
        />
        <Menu
          id="long-menu"
          anchorEl={anchorEl}
          keepMounted
          getContentAnchorEl={null}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          anchorOrigin={{
            vertical: "bottom",
            horizontal: "right",
          }}
          transformOrigin={{
            vertical: "top",
            horizontal: "right",
          }}
        >
          {deployment.state === "active" && (
            <MenuItem onClick={() => closeDeployment(deployment)}>
              <CancelPresentationIcon />
              &nbsp;Close
            </MenuItem>
          )}
        </Menu>
        <CardContent>
          <>
            <Typography variant="h6" gutterBottom>
              Bids
            </Typography>
            {!isLoadingBids && (
              <List component="nav" dense>
                {bids.map((bid) => (
                  <ListItem key={bid.provider}>
                    <ListItemText
                      primary={
                        <>
                          Price: {bid.price.amount}
                          {bid.price.denom}
                        </>
                      }
                      secondary={
                        <>
                          {bid.provider}
                          <br />
                          {bid.state}
                        </>
                      }
                    />
                    {bid.state === "open" && (
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={() => acceptBid(bid)}
                      >
                        Accept
                      </Button>
                    )}
                  </ListItem>
                ))}
              </List>
            )}
            {isLoadingBids && <CircularProgress />}

            <Typography variant="h6" gutterBottom>
              Leases
            </Typography>
            {!isLoadingLeases && (
              <>
                {leases.map((lease) => (
                  <LeaseRow key={lease.id} cert={props.cert} lease={lease} />
                ))}
              </>
            )}

            {isLoadingLeases && <CircularProgress />}
          </>
        </CardContent>
      </Card>
    </>
  );
}
