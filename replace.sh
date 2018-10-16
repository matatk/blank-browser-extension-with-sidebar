#!/bin/sh
shortName='bbews'
fullName='Blank Browser Extension with Sidebar'
author='Matthew Tylee Atkinson'
description='Just this blank extension, you know.'
url='https://github.com/matatk/bbews'
id='bbews@example.org'
githubUser='matatk'
rpl EXTENSION_NAME "$shortName" * .*
rpl GITHUB_USER "$githubUser" *.*
rpl -R EXTENSION_NAME "$shortName" build metadata scripts src test
rpl -R EXTENSION_LONG_NAME "$fullName" src
rpl -R EXTENSION_DESCRIPTION "$description" src
rpl -R EXTENSION_HOMEPAGE_URL "$url" src
rpl -R EXTENSION_ID "$id" src
rpl -R EXTENSION_AUTHOR "$author" src
