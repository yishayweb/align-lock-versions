import * as core from "@actions/core";
import * as github from "@actions/github";
import { exec, getExecOutput } from "@actions/exec";
import { getPackages } from "@manypkg/get-packages";
import { getDependentsGraph } from "./utils/getDependentsGraph";

const dependencyTypeMap = {
  dependencies: "",
  devDependencies: "--save-dev",
  peerDependencies: "--save-peer",
};

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

export const runPackageManagerVersionUpdate = async (
  dependentPackageToUpdate: string,
  dependencyName: string,
  depType: string
) => {
  // run pnpm command
  // pnpm --filter ${dependentPackageToUpdate} add ${dependencyName} ${dependencyTypeCommand}
  const dependencyTypeCommand = dependencyTypeMap[depType];
  await exec("pnpm", [
    "--filter",
    dependentPackageToUpdate,
    "add",
    dependencyName,
    dependencyTypeCommand,
  ]);
};

export const updateVersions = async (
  diffFilesArray: string[],
  dependentsMap: Map<string, { dependent: string; depType: string }[]>
) => {
  const packageScopeName = core.getInput("packageScopeName");
  const changelogRegex = /packages\/([A-Za-z0-9]+)\/CHANGELOG\.md$/;
  const packageNameWithPrefixRegex = new RegExp(
    `^@${packageScopeName}\/([A-Za-z0-9]+)$`
  );

  for (const candidateDependencyChangelogFile of diffFilesArray) {
    const isMatch = candidateDependencyChangelogFile.match(changelogRegex);
    if (isMatch) {
      const dependencyName = isMatch[1];
      const dependencyNameWithPrefix = `@${packageScopeName}/${dependencyName}`;

      const currPackageDependentsArray = dependentsMap.get(
        dependencyNameWithPrefix
      );

      if (Array.isArray(currPackageDependentsArray)) {
        for (const dependentObj of currPackageDependentsArray) {
          const { dependent: dependentNameWithPrefix, depType } = dependentObj;
          const isMatchedDependentName = dependentNameWithPrefix.match(
            packageNameWithPrefixRegex
          );

          if (isMatchedDependentName) {
            const dependentName = isMatchedDependentName[1];
            for (const fileName of diffFilesArray) {
              if (fileName === `packages/${dependentName}/CHANGELOG.md`) {
                await runPackageManagerVersionUpdate(
                  dependentNameWithPrefix,
                  dependencyNameWithPrefix,
                  depType
                );
              }
            }
          }
        }
      }
    }
  }
};

(async () => {
  const diffFilesArray = await getFilesDiffInPrBranch();
  const packagesObj = await getPackages(process.cwd());
  const dependents = getDependentsGraph(packagesObj);
  console.log("dependents in:", dependents);

  await updateVersions(diffFilesArray, dependents);

  const branchStatus = await getExecOutput("git", ["status"]);
  console.log("git branch after: ", branchStatus);

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

  const payload = JSON.stringify(github.context.payload, undefined, 2);
  console.log(`The event payload: ${payload}`);
})().catch((err) => {
  console.error(err);
  core.setFailed(err.message);
});
