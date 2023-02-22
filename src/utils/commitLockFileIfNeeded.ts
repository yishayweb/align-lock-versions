import { exec, getExecOutput } from "@actions/exec";

export const commitLockFileIfNeeded = async () => {
  const branchStatus = await getExecOutput("git", ["status"]);

  const modifiedLockFileRegex = /modified:\s+pnpm-lock.yaml/;
  const isModifiedLockFileMatched = branchStatus?.stdout?.match(
    modifiedLockFileRegex
  );

  if (isModifiedLockFileMatched) {
    console.log("commiting updated lock file to the pr");
    await exec("git", ["add", "pnpm-lock.yaml"]);
    await exec("git", ["commit", "-m", "update lock file automatically"]);
    await exec("git", ["push", "origin", "changeset-release/master"]);
  }
};
