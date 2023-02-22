import { setFailed } from "@actions/core";
import { getPackages } from "@manypkg/get-packages";
import { getDependentsGraph } from "./utils/getDependentsGraph";
import { updateVersionsInLock } from "./utils/updateVersionsInLock";
import { getFilesDiffInPrBranch } from "./utils/getFilesDiffInPrBranch";
import { commitLockFileIfNeeded } from "./utils/commitLockFileIfNeeded";

(async () => {
  // fetch the diff of files in the pr between the versioning branch and the master branch
  const diffFilesArray = await getFilesDiffInPrBranch();
  // get the package json files in an object format
  const packagesObj = await getPackages(process.cwd());
  // get the dependents map of packages in the repo
  const dependents = getDependentsGraph(packagesObj);
  console.log("dependents map:", dependents);

  // update the lock file if needed
  await updateVersionsInLock(diffFilesArray, dependents);

  // commit the lock file to the pr in case it was modified
  await commitLockFileIfNeeded();
})().catch((err) => {
  console.error(err);
  setFailed(err.message);
});
