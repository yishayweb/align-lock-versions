import { exec, getExecOutput } from "@actions/exec";
import * as github from "@actions/github";

export const commitLockFileIfNeeded = async () => {
  const branchStatus = await getExecOutput("git", ["status"]);

  const modifiedLockFileRegex = /modified:\s+pnpm-lock.yaml/;
  const isModifiedLockFileMatched = branchStatus?.stdout?.match(
    modifiedLockFileRegex
  );

  if (isModifiedLockFileMatched) {
    console.log("commiting updated lock file to the pr");

    const extendedBranchName = github.context.ref;
    const branchName = extendedBranchName.replace("refs/heads/", "");
    console.log("the branch name: ", github.context.ref);
    console.log("branch name: ", branchName);

    await exec("git", ["add", "pnpm-lock.yaml"]);
    await exec("git", [
      "commit",
      "-m",
      "chore: update lock file automatically",
    ]);
    await exec("git", ["push", "origin", `changeset-release/${branchName}`]);
  }
};
