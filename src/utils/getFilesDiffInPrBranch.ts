import { getExecOutput } from "@actions/exec";

export const getFilesDiffInPrBranch = async () => {
  const diff = await getExecOutput("git", [
    "diff",
    "--name-only",
    "origin/changeset-release/master..master",
  ]);

  // this array includes the names of the files changed in the version branch compared to the master branch
  const filesArray = diff.stdout.split("\n");

  return filesArray;
};
