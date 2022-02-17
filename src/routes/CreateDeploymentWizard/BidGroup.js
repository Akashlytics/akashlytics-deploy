import { makeStyles, ListSubheader, List, Box, Typography, Paper } from "@material-ui/core";
import { useEffect, useState } from "react";
import { deploymentGroupResourceSum } from "../../shared/utils/deploymentDetailUtils";
import { SpecDetail } from "../../shared/components/SpecDetail";
import { LabelValue } from "../../shared/components/LabelValue";
import { BidRow } from "./BidRow";

const useStyles = makeStyles((theme) => ({
  root: {
    marginBottom: "1rem"
  },
  subHeader: {
    display: "flex",
    alignItems: "center",
    paddingBottom: "6px",
    zIndex: 100,
    backgroundColor: theme.palette.common.white
  },
  secondaryText: {
    fontSize: ".8rem"
  },
  attributesContainer: {
    flexBasis: "45%",
    margin: "2px 0",
    backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: ".5rem",
    padding: ".5rem"
  },
  attributeTitle: {
    marginBottom: "2px"
  },
  attributeRow: {
    display: "flex",
    alignItems: "center",
    lineHeight: "1rem"
  },
  attributeText: {
    lineHeight: "1rem",
    letterSpacing: 0
  },
  chip: {
    height: "16px"
  },
  priceTooltip: {
    display: "flex",
    alignItems: "center",
    color: theme.palette.grey[600]
  }
}));

export function BidGroup({ bids, gseq, selectedBid, handleBidSelected, disabled, providers, filteredBids, deploymentDetail }) {
  const classes = useStyles();
  const [resources, setResources] = useState();
  const allBidsClosed = bids.every((b) => b.state === "closed");

  useEffect(() => {
    const currentGroup = deploymentDetail?.groups.find((g) => g.group_id.gseq === Number(gseq));
    if (currentGroup) {
      const resourcesSum = {
        cpuAmount: deploymentGroupResourceSum(currentGroup, (r) => parseInt(r.cpu.units.val) / 1000),
        memoryAmount: deploymentGroupResourceSum(currentGroup, (r) => parseInt(r.memory.quantity.val)),
        storageAmount: deploymentGroupResourceSum(currentGroup, (r) => parseInt(r.storage.quantity.val))
      };
      setResources(resourcesSum);
    }
  }, [deploymentDetail, gseq]);

  return (
    <Paper elevation={4} className={classes.root}>
      <List
        subheader={
          <ListSubheader component="div" className={classes.subHeader}>
            <Typography variant="h6">
              <LabelValue label="GSEQ:" value={gseq} />
            </Typography>

            {resources && (
              <Box marginLeft={2}>
                <SpecDetail
                  cpuAmount={resources.cpuAmount}
                  memoryAmount={resources.memoryAmount}
                  storageAmount={resources.storageAmount}
                  color={allBidsClosed ? "default" : "primary"}
                  size="small"
                />
              </Box>
            )}
          </ListSubheader>
        }
      >
        {bids
          .filter((bid) => filteredBids.includes(bid.id))
          .map((bid) => {
            const provider = providers && providers.find((x) => x.owner === bid.provider);
            return <BidRow key={bid.id} bid={bid} provider={provider} handleBidSelected={handleBidSelected} disabled={disabled} selectedBid={selectedBid} />;
          })}
      </List>
    </Paper>
  );
}
