#!/bin/sh
# Whirlpool / prepublish.sh
# prepublish script for Whirlpool
# (c) 2013 David (daXXog) Volm ><> + + + <><
# Released under Apache License, Version 2.0:
# http://www.apache.org/licenses/LICENSE-2.0.html  
#################################################

if [ ! -f com-npm-install ]; then
	node make
	rm npm-debug.log >> /dev/null
	mv com.sunsean.Whirlpool.js ../.tmp.com.sunsean.Whirlpool.js
	mv test.js ../.tmp.test.js
	mv whirlpool.js ../.tmp.js
	mv whirlpool.src.js ../.tmp.src.js
	mv whirlpool.h ../.tmp.h
else
	rm com-npm-install
fi