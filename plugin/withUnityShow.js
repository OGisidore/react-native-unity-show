'use strict';

const fs = require('fs');
const path = require('path');
const {
  createRunOncePlugin,
  withAppBuildGradle,
  withDangerousMod,
  withPodfile,
  withSettingsGradle,
} = require('@expo/config-plugins');

const pkg = require('../package.json');

const GENERATED_BEGIN = '@generated begin react-native-unity-show';
const GENERATED_END = '@generated end react-native-unity-show';

const DEFAULT_OPTIONS = {
  android: {
    unityLibraryModuleName: 'unityLibrary',
    unityLibraryPath: '../unity/android/unityLibrary',
  },
  ios: {
    unityFrameworkPath: '../unity/ios/UnityFramework.framework',
    unityPodspecName: 'UnityFramework',
  },
  failOnMissingUnityExport: false,
};

function withUnityShow(config, options = {}) {
  const normalizedOptions = normalizeUnityShowPluginOptions(options);

  config = withUnityShowAndroid(config, normalizedOptions);
  config = withUnityShowIos(config, normalizedOptions);

  return config;
}

function withUnityShowAndroid(config, options) {
  config = withSettingsGradle(config, (modConfig) => {
    modConfig.modResults.contents = updateAndroidSettingsGradle(
      modConfig.modResults.contents,
      options
    );
    return modConfig;
  });

  config = withAppBuildGradle(config, (modConfig) => {
    modConfig.modResults.contents = updateAndroidAppBuildGradle(
      modConfig.modResults.contents,
      options
    );
    return modConfig;
  });

  return config;
}

function withUnityShowIos(config, options) {
  config = withDangerousMod(config, [
    'ios',
    async (modConfig) => {
      const podspecPath = path.join(
        modConfig.modRequest.platformProjectRoot,
        `${options.ios.unityPodspecName}.podspec`
      );
      fs.writeFileSync(podspecPath, createUnityFrameworkPodspec(options));
      return modConfig;
    },
  ]);

  config = withPodfile(config, (modConfig) => {
    modConfig.modResults.contents = updateIosPodfile(
      modConfig.modResults.contents,
      options
    );
    return modConfig;
  });

  return config;
}

function normalizeUnityShowPluginOptions(options = {}) {
  return {
    android: {
      unityLibraryModuleName:
        options.android?.unityLibraryModuleName ??
        DEFAULT_OPTIONS.android.unityLibraryModuleName,
      unityLibraryPath:
        options.android?.unityLibraryPath ??
        DEFAULT_OPTIONS.android.unityLibraryPath,
    },
    ios: {
      unityFrameworkPath:
        options.ios?.unityFrameworkPath ??
        DEFAULT_OPTIONS.ios.unityFrameworkPath,
      unityPodspecName:
        options.ios?.unityPodspecName ?? DEFAULT_OPTIONS.ios.unityPodspecName,
    },
    failOnMissingUnityExport:
      options.failOnMissingUnityExport ??
      DEFAULT_OPTIONS.failOnMissingUnityExport,
  };
}

function updateAndroidSettingsGradle(contents, options) {
  const moduleName = options.android.unityLibraryModuleName;
  const unityLibraryPath = escapeGradleString(options.android.unityLibraryPath);
  const block = createGeneratedBlock('groovy', [
    `def unityShowLibraryProjectDir = file("${unityLibraryPath}")`,
    'if (unityShowLibraryProjectDir.exists()) {',
    `  include ':${moduleName}'`,
    `  project(':${moduleName}').projectDir = unityShowLibraryProjectDir`,
    '} else {',
    ...createMissingAndroidExportLines(options),
    '}',
  ]);

  return upsertGeneratedBlock(contents, block);
}

function updateAndroidAppBuildGradle(contents, options) {
  const moduleName = options.android.unityLibraryModuleName;
  const block = indentLines(
    createGeneratedBlock('groovy', [
      `if (findProject(':${moduleName}') != null) {`,
      `  implementation project(':${moduleName}')`,
      '}',
    ]),
    '    '
  );

  if (hasGeneratedBlock(contents)) {
    return replaceGeneratedBlock(contents, block);
  }

  const dependencyBlockPattern = /dependencies\s*\{/;
  if (!dependencyBlockPattern.test(contents)) {
    return `${contents.trimEnd()}\n\ndependencies {\n${block}\n}\n`;
  }

  return contents.replace(dependencyBlockPattern, (match) => `${match}\n${block}`);
}

function updateIosPodfile(contents, options) {
  const frameworkPath = escapeRubyString(options.ios.unityFrameworkPath);
  const podspecName = escapeRubyString(options.ios.unityPodspecName);
  const block = indentLines(
    createGeneratedBlock('ruby', [
      `unity_show_framework_path = File.expand_path('${frameworkPath}', __dir__)`,
      'if File.exist?(unity_show_framework_path)',
      `  pod '${podspecName}', :podspec => './${podspecName}.podspec'`,
      'else',
      ...createMissingIosExportLines(options),
      'end',
    ]),
    '  '
  );

  if (hasGeneratedBlock(contents)) {
    return replaceGeneratedBlock(contents, block);
  }

  const targetPattern = /(target ['"][^'"]+['"] do\s*\n)/;
  if (!targetPattern.test(contents)) {
    return `${contents.trimEnd()}\n\n${block}\n`;
  }

  return contents.replace(targetPattern, (match) => `${match}${block}\n`);
}

function createUnityFrameworkPodspec(options) {
  const podspecName = escapeRubyString(options.ios.unityPodspecName);
  const frameworkPath = escapeRubyString(options.ios.unityFrameworkPath);

  return `Pod::Spec.new do |s|
  s.name = '${podspecName}'
  s.version = '1.0.0'
  s.summary = 'Unity as a Library framework for react-native-unity-show.'
  s.homepage = 'https://unity.com'
  s.license = { :type => 'Unity Companion License' }
  s.author = 'Unity Technologies'
  s.platform = :ios, '16.4'
  s.source = { :path => '.' }
  s.vendored_frameworks = '${frameworkPath}'
end
`;
}

function createGeneratedBlock(language, lines) {
  const prefix = language === 'ruby' ? '#' : '//';
  return [
    `${prefix} ${GENERATED_BEGIN}`,
    ...lines,
    `${prefix} ${GENERATED_END}`,
  ].join('\n');
}

function createMissingAndroidExportLines(options) {
  const message = `[react-native-unity-show] Unity Android export not found at ${options.android.unityLibraryPath}`;
  if (options.failOnMissingUnityExport) {
    return [`  throw new GradleException("${escapeGradleString(message)}")`];
  }

  return [`  logger.lifecycle("${escapeGradleString(message)}")`];
}

function createMissingIosExportLines(options) {
  const message = `[react-native-unity-show] Unity iOS framework not found at ${options.ios.unityFrameworkPath}`;
  if (options.failOnMissingUnityExport) {
    return [`  raise '${escapeRubyString(message)}'`];
  }

  return [`  Pod::UI.puts '${escapeRubyString(message)}'`];
}

function hasGeneratedBlock(contents) {
  return contents.includes(GENERATED_BEGIN) && contents.includes(GENERATED_END);
}

function upsertGeneratedBlock(contents, block) {
  if (hasGeneratedBlock(contents)) {
    return replaceGeneratedBlock(contents, block);
  }

  return `${contents.trimEnd()}\n\n${block}\n`;
}

function replaceGeneratedBlock(contents, block) {
  const pattern = new RegExp(
    `.*${escapeRegExp(GENERATED_BEGIN)}[\\s\\S]*?${escapeRegExp(
      GENERATED_END
    )}.*`,
    'm'
  );

  return contents.replace(pattern, block);
}

function indentLines(value, indentation) {
  return value
    .split('\n')
    .map((line) => (line.length > 0 ? `${indentation}${line}` : line))
    .join('\n');
}

function escapeGradleString(value) {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function escapeRubyString(value) {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = createRunOncePlugin(withUnityShow, pkg.name, pkg.version);
module.exports.withUnityShow = withUnityShow;
module.exports.normalizeUnityShowPluginOptions = normalizeUnityShowPluginOptions;
module.exports.updateAndroidSettingsGradle = updateAndroidSettingsGradle;
module.exports.updateAndroidAppBuildGradle = updateAndroidAppBuildGradle;
module.exports.updateIosPodfile = updateIosPodfile;
module.exports.createUnityFrameworkPodspec = createUnityFrameworkPodspec;
