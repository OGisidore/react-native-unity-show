'use strict';

const {
  createUnityFrameworkPodspec,
  normalizeUnityShowPluginOptions,
  updateAndroidAppBuildGradle,
  updateAndroidSettingsGradle,
  updateIosPodfile,
} = require('../withUnityShow');

describe('withUnityShow config plugin helpers', () => {
  it('normalizes default Unity artifact paths', () => {
    expect(normalizeUnityShowPluginOptions()).toEqual({
      android: {
        unityLibraryModuleName: 'unityLibrary',
        unityLibraryPath: '../unity/android/unityLibrary',
      },
      ios: {
        unityFrameworkPath: '../unity/ios/UnityFramework.framework',
        unityPodspecName: 'UnityFramework',
      },
      failOnMissingUnityExport: false,
    });
  });

  it('adds Android unityLibrary wiring to settings.gradle idempotently', () => {
    const options = normalizeUnityShowPluginOptions();
    const settingsGradle = "pluginManagement {}\ninclude ':app'\n";

    const once = updateAndroidSettingsGradle(settingsGradle, options);
    const twice = updateAndroidSettingsGradle(once, options);

    expect(twice).toBe(once);
    expect(once).toContain("include ':unityLibrary'");
    expect(once).toContain('file("../unity/android/unityLibrary")');
  });

  it('adds Android app dependency conditionally', () => {
    const options = normalizeUnityShowPluginOptions();
    const appBuildGradle = "android {}\n\ndependencies {\n  implementation 'x:y:1'\n}\n";

    const result = updateAndroidAppBuildGradle(appBuildGradle, options);

    expect(result).toContain("if (findProject(':unityLibrary') != null)");
    expect(result).toContain("implementation project(':unityLibrary')");
  });

  it('adds a conditional UnityFramework pod to Podfile idempotently', () => {
    const options = normalizeUnityShowPluginOptions();
    const podfile = "platform :ios, '16.4'\ntarget 'Example' do\n  use_expo_modules!\nend\n";

    const once = updateIosPodfile(podfile, options);
    const twice = updateIosPodfile(once, options);

    expect(twice).toBe(once);
    expect(once).toContain("pod 'UnityFramework', :podspec => './UnityFramework.podspec'");
    expect(once).toContain("File.exist?(unity_show_framework_path)");
  });

  it('creates a podspec for the user-provided UnityFramework', () => {
    const options = normalizeUnityShowPluginOptions({
      ios: {
        unityFrameworkPath: '../unity/custom/UnityFramework.framework',
      },
    });

    const podspec = createUnityFrameworkPodspec(options);

    expect(podspec).toContain("s.name = 'UnityFramework'");
    expect(podspec).toContain("s.vendored_frameworks = '../unity/custom/UnityFramework.framework'");
  });

  it('escapes iOS plugin option strings for Ruby files', () => {
    const options = normalizeUnityShowPluginOptions({
      ios: {
        unityFrameworkPath: "../unity/ios/Owner's UnityFramework.framework",
      },
    });

    const podfile = updateIosPodfile("target 'Example' do\nend\n", options);

    expect(podfile).toContain("Owner\\'s UnityFramework.framework");
  });
});
