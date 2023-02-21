import * as core from "@actions/core";
import { exec, getExecOutput } from "@actions/exec";
import { getPackages } from "@manypkg/get-packages";
import { getDependentsGraph } from "./utils/getDependentsGraph";

const changelogRegex = /packages\/([A-Za-z0-9]+)\/CHANGELOG\.md$/;
const packageNameWithPrefixRegex = /^@yishay20\/([A-Za-z0-9]+)$/;

export const getDiff = async () => {
  const diff = await getExecOutput("git", [
    "diff",
    "--name-only",
    "origin/changeset-release/master..master",
  ]);

  const filesArray = diff.stdout.split("\n");

  return filesArray;
};

export const runPackageManagerVersionUpdate = async (
  dependentPackageToUpdate,
  dependencyName
) => {
  // run pnpm command
  // pnpm --filter ${dependentName} add ${packageNameWithPrefix} --save-peer
  await exec("pnpm", [
    "--filter",
    dependentPackageToUpdate,
    "add",
    dependencyName,
    "--save-peer",
  ]);
};

export const updateVersions = async (
  diffFilesArray: string[],
  dependentsMap: Map<string, { dependent: string; depType: string }[]>
) => {
  for (const candidateDependencyChangelogFile of diffFilesArray) {
    const isMatch = candidateDependencyChangelogFile.match(changelogRegex);
    if (isMatch) {
      const dependencyName = isMatch[1];
      const dependencyNameWithPrefix = `@yishay20/${dependencyName}`;

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
                  dependencyNameWithPrefix
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
  const diffFilesArray = await getDiff();
  const packagesObj = await getPackages(process.cwd());
  const dependents = getDependentsGraph(packagesObj);
  console.log("dependents:", dependents);

  await updateVersions(diffFilesArray, dependents);

  const branchAfter = await getExecOutput("git", ["status"]);
  console.log("git branch after: ", branchAfter);

  await exec("git", ["add", "pnpm-lock.yaml"]);
  await exec("git", ["commit", "-m", "update lock file automatically"]);
  await exec("git", ["push", "origin", "changeset-release/master"]);
})().catch((err) => {
  console.error(err);
  core.setFailed(err.message);
});
