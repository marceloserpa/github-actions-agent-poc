#!/bin/bash

echo '=== build IOS === '

xcodebuild \
  -workspace ios/todopoc.xcworkspace \
  -scheme todopoc \
  -sdk iphoneos \
  -configuration Release \
  -archivePath ios/build/todopoc.xcarchive \
  clean archive

echo '=== export ==== '

 xcodebuild -exportArchive \
    -archivePath ios/build/todopoc.xcarchive \
    -exportOptionsPlist ios/ExportOptions.plist \
    -exportPath ios/build/output \
    -allowProvisioningUpdates

echo '==== results ===='

ls -lh ios/build/output/