import { getExecOutput } from "@actions/exec";
import * as github from "@actions/github";

export const getFilesDiffInPrBranch = async () => {
  const extendedBranchName = github.context.ref;
  const branchName = extendedBranchName.replace("refs/heads/", "");
  console.log("the branch name: ", github.context.ref);
  console.log("branch name: ", branchName);
  const diff = await getExecOutput("git", [
    "diff",
    "--name-only",
    `origin/changeset-release/${branchName}..${branchName}`,
  ]);

  // this array includes the names of the files changed in the version branch compared to the master branch
  const filesArray = diff.stdout.split("\n");

  return filesArray;
};
