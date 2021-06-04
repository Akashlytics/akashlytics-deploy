import { MsgCloseDeployment } from "../../ProtoAkashTypes";
import { SigningStargateClient } from "@cosmjs/stargate";
import { customRegistry, baseFee, createFee } from "./blockchainUtils";
import { rpcEndpoint } from "../constants";

export async function closeDeployment(dseq, address, selectedWallet) {
  // handleMenuClose();
  const client = await SigningStargateClient.connectWithSigner(rpcEndpoint, selectedWallet, {
    registry: customRegistry
  });

  const closeJson = {
    id: {
      owner: address,
      dseq: parseInt(dseq)
    }
  };

  const closeDeploymentJson = {
    typeUrl: "/akash.deployment.v1beta1.MsgCloseDeployment",
    value: closeJson
  };

  const err = MsgCloseDeployment.verify(closeJson);

  if (err) throw err;

  await client.signAndBroadcast(address, [closeDeploymentJson], baseFee, "Test Akashlytics");
}

export async function acceptBid(bid, address, selectedWallet) {
  const client = await SigningStargateClient.connectWithSigner(rpcEndpoint, selectedWallet, {
    registry: customRegistry
  });

  const createLeaseMsg = {
    typeUrl: "/akash.market.v1beta1.MsgCreateLease",
    value: {
      bid_id: {
        owner: bid.owner,
        dseq: bid.dseq,
        gseq: bid.gseq,
        oseq: bid.oseq,
        provider: bid.provider
      }
    }
  };

  await client.signAndBroadcast(address, [createLeaseMsg], createFee("200000"), "Test Akashlytics");
}

export function deploymentResourceSum(deployment, resourceSelector) {
  return deployment.groups
    .map((g) => g.group_spec.resources.map((r) => r.count * resourceSelector(r.resources)).reduce((a, b) => a + b))
    .reduce((a, b) => a + b);
}

export function deploymentGroupResourceSum(group, resourceSelector) {
  if (!group || !group.group_spec || !group.group_spec) return 0;

  return group.group_spec.resources.map((r) => r.count * resourceSelector(r.resources)).reduce((a, b) => a + b);
}

export function deploymentToDto(d) {
  return {
    dseq: d.deployment.deployment_id.dseq,
    state: d.deployment.state,
    createdAt: parseInt(d.deployment.created_at),
    escrowBalance: d.escrow_account.balance,
    transferred: d.escrow_account.transferred,
    cpuAmount: deploymentResourceSum(d, (r) => parseInt(r.cpu.units.val) / 1000),
    memoryAmount: deploymentResourceSum(d, (r) => parseInt(r.memory.quantity.val)),
    storageAmount: deploymentResourceSum(d, (r) => parseInt(r.storage.quantity.val)),
    escrowAccount: { ...d.escrow_account },
    groups: [...d.groups]
  };
}
