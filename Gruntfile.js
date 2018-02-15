'use strict';

module.exports = function(grunt) {
  grunt.initConfig({
    eslint: {
      all: {
        src: [
          'Gruntfile.js',
          'tasks/**/*.js',
          'test/**/**/*.js',
          'backend/**/*.js',
          'frontend/js/**/*.js',
          'index.js'
        ]
      }
    },
    lint_pattern: {
      options: {
        rules: [
          { pattern: /(describe|it)\.only/, message: 'Must not use .only in tests' }
        ]
      },
      all: {
        src: ['<%= eslint.all.src %>']
      },
      css: {
        options: {
          rules: [
            { pattern: /important;(\s*$|(?=\s+[^\/]))/, message: 'CSS important rules only allowed with explanatory comment' }
          ]
        },
        src: [
          'frontend/css/**/*.less'
        ]
      }
    },

    mochacli: {
      options: {
        require: ['chai', 'mockery'],
        reporter: 'spec',
        timeout: process.env.TEST_TIMEOUT || 20000
      },
      backend: {
        options: {
          files: ['test/unit-backend/all.js', grunt.option('test') || 'test/unit-backend/**/*.js']
        }
      }
    },
    karma: {
      'unit-chrome': {
        configFile: './test/config/karma.conf.js',
        browsers: ['ChromeHeadlessNoSandbox']
      },
      'unit-firefox': {
        configFile: './test/config/karma.conf.js',
        browsers: ['FirefoxHeadlessNoSandbox']
      }
    }
  });

  grunt.loadNpmTasks('grunt-eslint');
  grunt.loadNpmTasks('@linagora/grunt-lint-pattern');
  grunt.loadNpmTasks('grunt-mocha-cli');
  grunt.loadNpmTasks('grunt-karma');

  grunt.registerTask('linters', 'Check code for lint', ['eslint:all', 'lint_pattern']);
  grunt.registerTask('test-unit-backend', 'Test backend code', ['mochacli:backend']);
  grunt.registerTask('test-unit-frontend-chrome', 'Test frontend code with chrome', ['karma:unit-chrome']);
  grunt.registerTask('test-unit-frontend-firefox', 'Test frontend code with firefox', ['karma:unit-firefox']);
  grunt.registerTask('test-unit-frontend', 'Test frontend code', ['test-unit-frontend-chrome', 'test-unit-frontend-firefox']);
  grunt.registerTask('test', ['linters', 'test-unit-frontend', 'test-unit-backend']);
  grunt.registerTask('default', ['test']);
};
