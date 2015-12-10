#!/bin/bash

# Fail On Error
set -e

TARBALL="clusternator.tar.gz"
ENCRYPTED_TARBALL="$TARBALL.asc"

# Locate *this* file
echo "Discovering Docker Environment"
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# change to this directory
cd $DIR

# check if decryption is necessary
if [ -e ./$ENCRYPTED_TARBALL ]; then
  # decrypt the configuration(s)
  echo "Decrypting Configuration"
  gpg --out  ./$TARBALL --passphrase $PASSPHRASE --decrypt ./$ENCRYPTED_TARBALL

  # extract the configuration tarball
  echo "Extracting Configuration Tarball"
  tar xfz ./$TARBALL

  # run docker login (Clusternator only)
  ./.private/docker-login.sh
fi


# Start the service
echo "Starting Service"
npm start
