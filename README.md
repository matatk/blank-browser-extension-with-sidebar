This is my template for creating browser extensions (that have a toggle-able browser action pop-up and sidebar) using the WebExtension API. This README file is mostly a template for the README for the extension to be created, but the [Changes](#changes) section does relate to the development of this repo. In order to make a new extension from this repo, you would:

1. Clone this repo.
2. Edit `replace.sh` with metadata values appropriate for your extension.
3. Run `./replace.sh` to put the metadata values in the right places in the code for the extension.
4. Remove this section from the README.
5. You can then develop your new extension and use commands like `npm run build:all` to lint, test and build it.
6. If you're going to be using git to track revisions of the extension you create, it's a good idea to delete the `.git/` directory and then run `git init` once you've run (and deleted) `replace.sh` so that you're starting with a clean repo.

***

# EXTENSION_NAME

[![Build Status](https://travis-ci.org/GITHUB_USER/EXTENSION_NAME.svg?branch=master)](https://travis-ci.org/GITHUB_USER/EXTENSION_NAME)

This is a browser extension (for Firefox, Chrome and Opera) that...

Table of Contents
-----------------

-   [Installation](#installation)
-   [Development](#development)
-   [Changes](#changes)

Installation
------------

-   **Firefox:** [Install via Mozilla Add-ons](https://addons.mozilla.org/addon/EXTENSION_NAME/)
-   **Chrome:** [Install via the Chrome Web Store](https://chrome.google.com/webstore/detail/EXTENSION_NAME)
-   **Opera:** [Install via Opera add-ons](https://addons.opera.com/en-gb/extensions/details/EXTENSION_NAME/)

**If you need support, please [check the known issues for EXTENSION_NAME](https://github.com/GITHUB_USER/EXTENSION_NAME/issues) and, if necessary, file a new issue using the "New Issue" button on that page.**

Development
-----------

You can build and run the current code locally as follows.

1.  Clone [the EXTENSION_NAME repository on GitHub](https://github.com/GITHUB_USER/EXTENSION_NAME) to your computer.

2.  Ensure you have all the required build tools with `npm install` (you will need [Node.js](https://nodejs.org/)).

3.  Run the build script to build one or all of the extensions:

    -   `npm run build:firefox`
    -   `npm run build:chrome`
    -   `npm run build:opera`
    -   `npm run build:edge` (Edge support is in development, but not fully ready yet.)
    -   `npm run build:all`

    The built versions of the extension are placed in the `build/<browser>/` directories and ZIP files for each will be created in the root of the checked-out repository.

4.  To load and use the extension locally in your browser...
    -   **Firefox:** either:
        -   use [Mozilla's instructions on temporarily loading extensions from disk](https://developer.mozilla.org/en-US/Add-ons/WebExtensions/Packaging_and_installation#Loading_from_disk), or
        -   if you have [`web-ext`](https://developer.mozilla.org/en-US/Add-ons/WebExtensions/Getting_started_with_web-ext) installed, issue `npm run start:firefox` to open Firefox with EXTENSION_NAME loaded. It will keep itself up-to-date when you re-build.
    -   **Chrome:** follow [Google's instructions on loading the extension](https://developer.chrome.com/extensions/getstarted#unpacked).
    -   **Opera:** refer to [Testing and Debugging](https://dev.opera.com/extensions/testing/).
    -   **Edge:** use the [Adding, moving, and removing extensions for Microsoft Edge](https://docs.microsoft.com/en-us/microsoft-edge/extensions/guides/adding-and-removing-extensions) instructions on Microsoft's developer site.

Some further info on the test/build process:

-   Automated tests are run as a pre-requisite part of the build process; you can also run them with `npm test`.

-   You can remove the `build/<browser>/` directories and ZIP files with `npm run clean:<browser>` and `npm run clean:all`, as with the build scripts above.

-   Because the process of rasterising the SVG to variously-sized PNGs is slow, the PNGs are cached so they only need to be re-generated when the SVG changes. You can clean out the cache with `npm run clean:cache`.

-   The `pre-commit` hook is used to ensure only code that passes tests is committed (it does this by running a build, which, in turn, runs the tests). [Husky](https://github.com/typicode/husky) manages this so that a build is run before you are asked for a commit message.

-   The `build:chrome:test` script is provided for making an alpha/beta/test build for Chrome, which is the same as a normal build, but the extension is retitled to "EXTENSION_NAME (test version)". A separate extension listing is required for publishing test versions in the Chrome Web Store. For Firefox Add-ons, a version number such as "2.1.0beta1" can be used and the built package can be uploaded to the extension's beta channel.

Changes
-------

### 0.0.2

* No need to check for DOMContentLoaded in options and GUI scripts, as they are included via `<script>` tags at the end of the `<body>`.

### 0.0.1

* Initial release.
