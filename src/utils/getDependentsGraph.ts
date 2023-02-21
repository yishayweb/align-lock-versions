import { Packages, Package } from "@manypkg/get-packages";
import getDependencyGraph from "./getDependencyGraph";

export function getDependentsGraph(
  packages: Packages,
  opts?: { bumpVersionsWithWorkspaceProtocolOnly?: boolean }
) {
  const graph: Map<
    string,
    { pkg: Package; dependents: Array<{ dependent: string; depType: string }> }
  > = new Map();

  const { graph: dependencyGraph } = getDependencyGraph(packages, {
    bumpVersionsWithWorkspaceProtocolOnly:
      opts?.bumpVersionsWithWorkspaceProtocolOnly === true,
  });

  const dependentsLookup: {
    [key: string]: {
      pkg: Package;
      dependents: Array<{ dependent: string; depType: string }>;
    };
  } = {};

  packages.packages.forEach((pkg) => {
    dependentsLookup[pkg.packageJson.name] = {
      pkg,
      dependents: [],
    };
  });

  packages.packages.forEach((pkg) => {
    const dependent = pkg.packageJson.name;
    const valFromDependencyGraph = dependencyGraph.get(dependent);
    if (valFromDependencyGraph) {
      const dependencies = valFromDependencyGraph.dependencies;

      dependencies.forEach((dependency) => {
        dependentsLookup[dependency.depName].dependents.push({
          dependent,
          depType: dependency.depType,
        });
      });
    }
  });

  Object.keys(dependentsLookup).forEach((key) => {
    graph.set(key, dependentsLookup[key]);
  });

  const simplifiedDependentsGraph: Map<
    string,
    Array<{ dependent: string; depType: string }>
  > = new Map();

  graph.forEach((pkgInfo, pkgName) => {
    simplifiedDependentsGraph.set(pkgName, pkgInfo.dependents);
  });

  return simplifiedDependentsGraph;
}
