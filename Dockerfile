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
      make \
      pkg-config \
      python-numpy \
      python-pip \
      software-properties-common \
      swig \
      zip \
      zlib1g-dev \
      && \
  apt-get clean && \
  rm -rf /var/lib/apt/lists/*

RUN curl -OL http://prdownloads.sourceforge.net/ta-lib/ta-lib-0.4.0-src.tar.gz \
      && tar -xvzf ta-lib-0.4.0-src.tar.gz \
      && cd ta-lib/ \
      && ./configure --prefix=/usr \
      && make \
      && make install \

RUN pip install --upgrade pip

RUN pip --no-cache-dir install \
        numpy \
        ipykernel \
        jupyter \
        matplotlib \
        TA-Lib \
        zipline
