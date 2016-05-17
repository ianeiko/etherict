FROM python:3.5-slim

RUN apt-get update && apt-get install -y \
      build-essential \
      curl \
      g++ \
      git \
      gfortran \
      libblas-dev \
      liblapack-dev \
      libfreetype6-dev \
      libpng12-dev \
      libzmq3-dev \
      pkg-config \
      python3-dev \
      python-dev \
      python-numpy \
      python-pip \
      software-properties-common \
      swig \
      zip \
      zlib1g-dev \
      && \
  apt-get clean && \
  rm -rf /var/lib/apt/lists/*

RUN pip --no-cache-dir install \
        numpy \
        ipykernel \
        jupyter \
        matplotlib \
        TA-Lib \
        zipline
