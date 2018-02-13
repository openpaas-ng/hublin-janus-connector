'use strict';

module.exports = function(config) {
  var singleRun = process.env.SINGLE_RUN ? process.env.SINGLE_RUN !== 'false' : true;

  config.set({
    basePath: '../../',
    files: [
      'frontend/components/chai/chai.js',
      'frontend/components/chai-spies/chai-spies.js',
      'node_modules/chai-shallow-deep-equal/chai-shallow-deep-equal.js',
      'node_modules/sinon/pkg/sinon.js',
      'frontend/components/sinon-chai/lib/sinon-chai.js',
      'frontend/components/lodash/dist/lodash.min.js',
      'frontend/components/jquery/dist/jquery.min.js',
      'frontend/components/angular/angular.min.js',
      'frontend/components/angular-ui-router/release/angular-ui-router.min.js',
      'frontend/components/angular-mocks/angular-mocks.js',
      'frontend/components/dynamic-directive/dist/dynamic-directive.min.js',
      'test/config/mocks/*.js',
      'frontend/js/**/*.js',
      'test/unit-frontend/**/*.js',
      'frontend/views/**/*.jade'
    ],
    exclude: [
      'frontend/js/run.js'
    ],
    frameworks: ['mocha'],
    colors: true,
    singleRun: singleRun,
    autoWatch: true,
    browsers: ['PhantomJS', 'Chrome', 'Firefox', 'safari', 'ChromeWithDebugging'],
    customLaunchers: {
      ChromeWithDebugging: {
        base: 'Chrome',
        flags: ['--remote-debugging-port=9222'],
        debug: true
      }
    },
    reporters: singleRun ? ['coverage', 'spec'] : ['spec'],
    preprocessors: {
      'frontend/js/**/*.js': ['coverage'],
      '**/*.jade': ['ng-jade2module']
    },
    plugins: [
      'karma-phantomjs-launcher',
      'karma-chrome-launcher',
      'karma-firefox-launcher',
      'karma-safari-launcher',
      'karma-mocha',
      'karma-coverage',
      'karma-spec-reporter',
      '@linagora/karma-ng-jade2module-preprocessor'
    ],
    coverageReporter: {type: 'text', dir: '/tmp'},
    ngJade2ModulePreprocessor: {
      stripPrefix: 'frontend',
      // setting this option will create only a single module that contains templates
      // from all the files, so you can load them all with module('templates')
      jadeRenderConfig: {
        __: function(str) {
          return str;
        }
      },
      moduleName: 'jadeTemplates'
    }
  });
};
