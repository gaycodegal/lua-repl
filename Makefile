ICON_DIR=html/icons
LOGO_NAME=lua-logo
LOGO_RAW=lua-logo-nolabel-full.png
PACK_NAME=Lua-REPL
PACK_NAME_ZIP=$(PACK_NAME).zip
PACK_NAME_WBN=$(PACK_NAME).wbn
LOGO_FILETYPE=webp
# required to be png by lighthouse test
SPLASH_FILETYPE=png

all:
	cd ./third_party && emmake make -f ./lua-5.4.4.makefile wasm
clean:
	git clean -fX
dry-clean:
	git clean -nX
re:
	make clean all
format:
	clang-format -i $(shell find source/ headers/ term/ -iname '*.[ch]')
	clang-format -i $(shell find source/ headers/ term/ -iname '*.[ch][ch]')
web-bundle:
# make both the wbn and the zip file
	mkdir -p $(PACK_NAME)
	mkdir -p $(PACK_NAME)/html
	cat web-bundle-files.txt | rg -v '#' | xargs cp --parents -t $(PACK_NAME)/
	/HOME/go/bin/gen-bundle -dir $(PACK_NAME) -baseURL 'https://gaycodegal.github.io/wasm-term/html/' -primaryURL 'https://gaycodegal.github.io/wasm-term/html/' -o $(PACK_NAME_WBN)
	rm -f $(PACK_NAME_ZIP)
	zip -r $(PACK_NAME_ZIP) $(PACK_NAME)
icons:
# make a favicon
	convert $(LOGO_RAW) -resize 16x16\!  favicon.$(LOGO_FILETYPE)
	mv favicon.$(LOGO_FILETYPE) favicon.ico
# PWA needs 192² and 512² images so we start with a full res 1500²
# exported from gimp from the ps file then do image magick.
# we also want maskable versions, which are inset with a 10% border
# on all sides
	mkdir -p $(ICON_DIR)
	convert $(LOGO_RAW) -resize 192x192\!  $(ICON_DIR)/$(LOGO_NAME)-192.$(LOGO_FILETYPE)
# 154 + 19 * 2 == 192
	convert $(LOGO_RAW) -resize 154x154\!  temp.$(LOGO_FILETYPE)
	convert temp.$(LOGO_FILETYPE) -bordercolor white -border 19 $(ICON_DIR)/$(LOGO_NAME)-192-mask.$(LOGO_FILETYPE)

# now for the splash icons
	convert $(LOGO_RAW) -resize 512x512\!  $(ICON_DIR)/$(LOGO_NAME)-512.$(SPLASH_FILETYPE)
# 410 + 51 * 2 == 512
	convert $(LOGO_RAW) -resize 410x410\!  temp.$(SPLASH_FILETYPE)
	convert temp.$(SPLASH_FILETYPE) -bordercolor white -border 51 $(ICON_DIR)/$(LOGO_NAME)-512-mask.$(SPLASH_FILETYPE)

	rm temp.$(SPLASH_FILETYPE)
	rm temp.$(LOGO_FILETYPE)
