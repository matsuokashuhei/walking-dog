const fs = require('fs');
const path = require('path');
const { withDangerousMod, withXcodeProject } = require('expo/config-plugins');
const xcode = require('xcode');

function withStableWidgetBuildPhases(config) {
  const configured = withXcodeProject(config, (config) => {
    normalizeXcodeProject(config.modResults, config.version);
    return config;
  });

  return withDangerousMod(configured, [
    'ios',
    async (config) => {
      const pbxprojPath = path.join(
        config.modRequest.platformProjectRoot,
        'WalkingDog.xcodeproj',
        'project.pbxproj',
      );
      if (!fs.existsSync(pbxprojPath)) {
        return config;
      }

      const project = xcode.project(pbxprojPath);
      project.parseSync();
      normalizeXcodeProject(project, config.version);
      fs.writeFileSync(pbxprojPath, project.writeSync());

      return config;
    },
  ]);
}

function normalizeXcodeProject(project, version) {
  const projectObjects = project.hash.project.objects;
  const targets = projectObjects.PBXNativeTarget ?? {};
  const shellScriptPhases = projectObjects.PBXShellScriptBuildPhase ?? {};
  const buildConfigurations = projectObjects.XCBuildConfiguration ?? {};

  for (const target of Object.values(targets)) {
    if (
      !target ||
      target.productType !== '"com.apple.product-type.application"' ||
      !Array.isArray(target.buildPhases)
    ) {
      continue;
    }

    const embedPodsIndex = target.buildPhases.findIndex(
      (phase) => phase.comment === '[CP] Embed Pods Frameworks',
    );
    const embedExtensionsIndex = target.buildPhases.findIndex(
      (phase) =>
        phase.comment === 'Embed Foundation Extensions' ||
        phase.comment === 'Embed App Extensions',
    );

    if (
      embedPodsIndex === -1 ||
      embedExtensionsIndex === -1 ||
      embedPodsIndex < embedExtensionsIndex
    ) {
      continue;
    }

    // Xcode's dependency analysis can form a cycle when extension embedding
    // runs before CocoaPods embeds the app frameworks.
    const [embedPodsPhase] = target.buildPhases.splice(embedPodsIndex, 1);
    const updatedEmbedExtensionsIndex = target.buildPhases.findIndex(
      (phase) =>
        phase.comment === 'Embed Foundation Extensions' ||
        phase.comment === 'Embed App Extensions',
    );
    target.buildPhases.splice(updatedEmbedExtensionsIndex, 0, embedPodsPhase);
  }

  for (const [phaseId, phase] of Object.entries(shellScriptPhases)) {
    if (
      phaseId.endsWith('_comment') ||
      phase?.name !== '"[Expo Dev Launcher] Strip Local Network Keys for Release"'
    ) {
      continue;
    }

    phase.alwaysOutOfDate = 1;
    phase.inputPaths = [];
  }

  for (const [configurationId, configuration] of Object.entries(buildConfigurations)) {
    if (
      configurationId.endsWith('_comment') ||
      !configuration?.buildSettings?.MARKETING_VERSION ||
      !version
    ) {
      continue;
    }

    configuration.buildSettings.MARKETING_VERSION = version;
  }
}

module.exports = withStableWidgetBuildPhases;
