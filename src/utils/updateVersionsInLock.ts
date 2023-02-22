import { getInput } from "@actions/core";
import { exec } from "@actions/exec";

const dependencyTypeMap = {
  dependencies: "",
  devDependencies: "--save-dev",
  peerDependencies: "--save-peer",
};

const runPackageManagerVersionUpdate = async (
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

export const updateVersionsInLock = async (
  diffFilesArray: string[],
  dependentsMap: Map<string, { dependent: string; depType: string }[]>
) => {
  const packageScopeName = getInput("packageScopeName");
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
