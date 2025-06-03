    // Toggable console.debug() function
    console.debug = function () {
        if (window.SETTINGS && window.SETTINGS.debug) {
            if (arguments.length > 1)
                console.log(arguments);
            else
                console.log(arguments[0]);
        }
    };

    /**
     * Get URL parameter in Javascript
     * @param name {string} - The name of the parameter to retrieve from the URL
     * @returns {string} - The value of the parameter, or null if not found
     */
    function getURLParameter(name) {
        return new URLSearchParams(window.location.search).get(name);
    }

    function expandDatatableHeight() {
        // Calculate the available height for the table by subtracting 75 from the container height
        var fill_height = $('#objects-list_wrapper').height() - 75;
        // Define the height of a single table row
        var row_height = 36;
        // Calculate the number of rows that can fit in the available space
        var number_of_rows = Math.floor(fill_height / row_height);
        // Update the number of rows displayed in the table and redraw
        $('#objects-list').DataTable().page.len(parseInt(number_of_rows.toString())).draw();
    }

    // translation langue
    function tr(s) {
        return MapEntity.i18n[s] || s;
    }

    //cette fonction personnalise TinyMCE pour gérer les limites de caractères et améliorer
    // l'expérience utilisateur avec des validations visuelles.
    // ceci pourrait être réécrit en js ou gardé tel quel pour garantir la compatibilité
    function tinyMceInit(editor) {
        var context = $('body').data();
        editor.on('WordCountUpdate', function(event) {
            console.log(window.SETTINGS);
            // DEPRECATED paramters maxCharacters -> to remove
            if (("container" in event.target) && (window.SETTINGS.maxCharacters > 0)) {
                var characters = event.wordCount.characters;
                if (characters > window.SETTINGS.maxCharacters) {
                    event.target.container.classList.add('cec-overflow');
                } else {
                    event.target.container.classList.remove('cec-overflow');
                }
            }
            if (("container" in event.target) && (window.SETTINGS.maxCharactersByField)) {
                var fullTableName = context.appname+"_"+context.modelname
                if (fullTableName in window.SETTINGS.maxCharactersByField) {
                    var currenInputName = event.target.container.previousSibling.name;
                    window.SETTINGS.maxCharactersByField[fullTableName].forEach(config => {
                        if(config.field == currenInputName) {
                            var statusBar = $(event.target.container).find(".tox-statusbar__wordcount");
                            $(event.target.container).find(".injectedCount").remove()
                            $("<p class='injectedCount'>"+event.wordCount.characters+"/"+config.value+" characters</p>").insertBefore(statusBar)
                            if(event.wordCount.characters > config.value) {

                                event.target.container.classList.add('cec-overflow');
                                event.target.container.classList.add('is-invalid');
                            } else {
                                event.target.container.classList.remove('cec-overflow');
                                event.target.container.classList.remove('is-invalid');
                            }
                        }
                    })
                }
            }
        });
    }

    // https://stackoverflow.com/questions/11068240/what-is-the-most-efficient-way-to-parse-a-css-color-in-javascript
    // answered Oct 14, 2013 at 17:57
    // Adam Lockhart
    /**
     * Parse a color string into an array of RGBA values.
     * @param color
     * @returns {(number|number)[]|(string|number)[]|number[]|*}
     */
    function parseColor(color, defaultAlpha = 1) {
        color = color.trim().toLowerCase();
        color = _colorsByName[color] || color;
        let hex3 = color.match(/^#([0-9a-f]{3})$/i);
        if (hex3) {
            hex3 = hex3[1];
            return [
                parseInt(hex3.charAt(0),16)*0x11,
                parseInt(hex3.charAt(1),16)*0x11,
                parseInt(hex3.charAt(2),16)*0x11,
                defaultAlpha
            ];
        }
        let hex6 = color.match(/^#([0-9a-f]{6})$/i);
        if (hex6) {
            hex6 = hex6[1];
            return [
                parseInt(hex6.slice(0, 2), 16),
                parseInt(hex6.slice(2, 4), 16),
                parseInt(hex6.slice(4, 6), 16),
                defaultAlpha
            ];
        }
        let rgba = color.match(/^rgba\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+.*\d*)\s*\)$/i) || color.match(/^rgba\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i);
        if( rgba ) {
            return [rgba[1],rgba[2],rgba[3], rgba[4]===undefined?defaultAlpha:rgba[4]];
        }

        let rgb = color.match(/^rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i);
        if( rgb ) {
            return [rgb[1],rgb[2],rgb[3],defaultAlpha];
        }

        if(color.indexOf('hsl')== 0){
            return _hslToRgb(color);
        }
    }

    function _hslToRgb(hsl){
        if(typeof hsl== 'string'){
            hsl= hsl.match(/(\d+(\.\d+)?)/g);
        }
        let sub, h= hsl[0]/360, s= hsl[1]/100, l= hsl[2]/100, a = hsl[3]===undefined?1:hsl[3], t1, t2, t3, rgb, val;
        if(s== 0){
            val= Math.round(l*255);
            rgb= [val, val, val, a];
        }
        else{
            if(l<0.5)
                t2= l*(1 + s);
            else
                t2= l + s - l*s;
            t1 = 2*l - t2;
            rgb = [0, 0, 0];
            for(var i=0; i<3; i++){
                t3 = h + 1/3 * -(i - 1);
                t3 < 0 && t3++;
                t3 > 1 && t3--;
                if (6 * t3 < 1)
                    val= t1 + (t2 - t1) * 6 * t3;
                else if (2 * t3 < 1)
                    val= t2;
                else if (3*t3<2)
                    val = t1 + (t2 - t1) * (2 / 3 - t3) * 6;
                else
                    val= t1;
                rgb[i] = Math.round(val*255);
            }
        }
        rgb.push(a);
        return rgb;
    }

    const _colorsByName = {aliceblue:"#f0f8ff",antiquewhite:"#faebd7",aqua:"#00ffff",aquamarine:"#7fffd4",azure:"#f0ffff",beige:"#f5f5dc",bisque:"#ffe4c4",
        black:"#000000",blanchedalmond:"#ffebcd",blue:"#0000ff",blueviolet:"#8a2be2",brown:"#a52a2a",burlywood:"#deb887",cadetblue:"#5f9ea0",
        chartreuse:"#7fff00",chocolate:"#d2691e",coral:"#ff7f50",cornflowerblue:"#6495ed",cornsilk:"#fff8dc",crimson:"#dc143c",cyan:"#00ffff",
        darkblue:"#00008b",darkcyan:"#008b8b",darkgoldenrod:"#b8860b",darkgray:"#a9a9a9",darkgreen:"#006400",darkkhaki:"#bdb76b",
        darkmagenta:"#8b008b",darkolivegreen:"#556b2f",darkorange:"#ff8c00",darkorchid:"#9932cc",darkred:"#8b0000",darksalmon:"#e9967a",
        darkseagreen:"#8fbc8f",darkslateblue:"#483d8b",darkslategray:"#2f4f4f",darkturquoise:"#00ced1",darkviolet:"#9400d3",deeppink:"#ff1493",
        deepskyblue:"#00bfff",dimgray:"#696969",dodgerblue:"#1e90ff",firebrick:"#b22222",floralwhite:"#fffaf0",forestgreen:"#228b22",
        fuchsia:"#ff00ff",gainsboro:"#dcdcdc",ghostwhite:"#f8f8ff",gold:"#ffd700",goldenrod:"#daa520",gray:"#808080",green:"#008000",
        greenyellow:"#adff2f",honeydew:"#f0fff0",hotpink:"#ff69b4",indianred :"#cd5c5c",indigo :"#4b0082",ivory:"#fffff0",khaki:"#f0e68c",
        lavender:"#e6e6fa",lavenderblush:"#fff0f5",lawngreen:"#7cfc00",lemonchiffon:"#fffacd",lightblue:"#add8e6",lightcoral:"#f08080",
        lightcyan:"#e0ffff",lightgoldenrodyellow:"#fafad2",lightgray:"#d3d3d3",lightgreen:"#90ee90",lightpink:"#ffb6c1",lightsalmon:"#ffa07a",
        lightseagreen:"#20b2aa",lightskyblue:"#87cefa",lightslategray:"#778899",lightsteelblue:"#b0c4de",lightyellow:"#ffffe0",lime:"#00ff00",
        limegreen:"#32cd32",linen:"#faf0e6",magenta:"#ff00ff",maroon:"#800000",mediumaquamarine:"#66cdaa",mediumblue:"#0000cd",
        mediumorchid:"#ba55d3",mediumpurple:"#9370db",mediumseagreen:"#3cb371",mediumslateblue:"#7b68ee",mediumspringgreen:"#00fa9a",
        mediumturquoise:"#48d1cc",mediumvioletred:"#c71585",midnightblue:"#191970",mintcream:"#f5fffa",mistyrose:"#ffe4e1",moccasin:"#ffe4b5",
        navajowhite:"#ffdead",navy:"#000080",oldlace:"#fdf5e6",olive:"#808000",olivedrab:"#6b8e23",orange:"#ffa500",orangered:"#ff4500",
        orchid:"#da70d6",palegoldenrod:"#eee8aa",palegreen:"#98fb98",paleturquoise:"#afeeee",palevioletred:"#db7093",papayawhip:"#ffefd5",
        peachpuff:"#ffdab9",peru:"#cd853f",pink:"#ffc0cb",plum:"#dda0dd",powderblue:"#b0e0e6",purple:"#800080",red:"#ff0000",rosybrown:"#bc8f8f",
        royalblue:"#4169e1",saddlebrown:"#8b4513",salmon:"#fa8072",sandybrown:"#f4a460",seagreen:"#2e8b57",seashell:"#fff5ee",sienna:"#a0522d",
        silver:"#c0c0c0",skyblue:"#87ceeb",slateblue:"#6a5acd",slategray:"#708090",snow:"#fffafa",springgreen:"#00ff7f",steelblue:"#4682b4",
        tan:"#d2b48c",teal:"#008080",thistle:"#d8bfd8",tomato:"#ff6347",turquoise:"#40e0d0",violet:"#ee82ee",wheat:"#f5deb3",white:"#ffffff",
        whitesmoke:"#f5f5f5",yellow:"#ffff00",yellowgreen:"#9acd32"
    };
