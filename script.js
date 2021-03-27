// import { saveAs } from './node_modules/file-saver/dist/FileSaver';
var zip = new JSZip();
let zipButton = document.getElementById("zipButton");
zipButton.style.display = "none";

var imageLoader = document.getElementById('imageLoader');
imageLoader.addEventListener('change', handleImage, false);
var canvas = document.getElementById('imageCanvas');
var ctx = canvas.getContext('2d');
var content = "";
let cm = new CodeMirror.fromTextArea(document.getElementById("editor"), {
    lineNumbers: true,
    theme: "material-ocean"
});
cm.setSize(750, 600);
var imgLoaded = false;
var imgData;

var modalBG = document.getElementById("myModal");
var modal = document.getElementById("modelContent");
var infobtn = document.getElementById("infoButton");
var infomodalBG = document.getElementById("infoModal");
var infomodal = document.getElementById("infoModalContent");
var span = document.getElementsByClassName("modalClose")[0];
var infospan = document.getElementById("infoModalClose");

document.getElementById("cliButton").onclick = () => {modalAppear("There's also a CLI tool for lumen!\n Check it out here!",false,"20%","10%")};
document.getElementById("notaHiddenButton").onclick = () => {modalAppear("Hey! You're not supposed to find this!\n Why did you click here anyways?",false,"20%","10%")};
infobtn.onclick = infoModalAppear;
span.onclick = modalDissapear;
modalBG.onclick = modalDissapear;
infospan.onclick = infoModalDissapear;
infomodalBG.onclick = infoModalDissapear;

function modalAppear(text,center,width,height) {
    modalBG.style.display = "none";
    modalBG.classList.remove("modalbg-dissapear");
    modal.classList.remove("modal-dissapear");
    var modalText = document.getElementById("modalText");
    modalText.style.textAlign = "left";
    modal.style.width = width;
    modal.style.height = height;
    if (center) modalText.style.textAlign = "center";
    modalText.innerHTML = text;
    if (!modalBG.classList.contains("modal-dissapear")) {
        modalBG.style.display = "block";
        modal.style.transform = "translate(0px, 0px)";
    }
}

function infoModalAppear() {
    infomodalBG.style.display = "block";
    infomodal.style.transform = "translate(0px, 0px)";
}

function modalDissapear() {
    modal.classList.add("modal-dissapear");
    modalBG.classList.add("modalbg-dissapear");
    setTimeout(() => {
        modalBG.style.display = "none";
        modalBG.classList.remove("modalbg-dissapear");
        modal.classList.remove("modal-dissapear");
    }, 650);
}

function infoModalDissapear() {
    infomodal.classList.add("modal-dissapear");
    infomodalBG.classList.add("modalbg-dissapear");
    setTimeout(() => {
        infomodalBG.style.display = "none";
        infomodalBG.classList.remove("modalbg-dissapear");
        infomodal.classList.remove("modal-dissapear");
    }, 650);
}

function handleImage(e) {
    document.getElementById("selectButton").remove();
    var reader = new FileReader();
    reader.onload = function (event) {
        var img = new Image();
        img.onload = function () {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            imgData = ctx.getImageData(0, 0, img.width, img.height);
            let pixelArr = imgData.data;
            let emissivePixels = { x: [], y: [] };
            for (let i = 0; i < pixelArr.length / 4; i++) {
                let x = i % imgData.height;
                let y = Math.floor(i / imgData.height);
                let red = pixelArr[4 * i];
                let green = pixelArr[4 * i + 1];
                let blue = pixelArr[4 * i + 2];
                if (red == 255 && green == 255 && blue == 127) {
                    emissivePixels.x.push(x);
                    emissivePixels.y.push(y);
                }
            }
            let Strips = strips(emissivePixels.x, emissivePixels.y);
            Strips = column(Strips);
            for (let i = 0; i < Strips.x.length; i++) {
                if (Array.isArray(Strips.x[i]) && Array.isArray(Strips.y[i])) {
                    content += `if (x >= ${Strips.x[i][0]} && x <= ${Strips.x[i][1]} && y >= ${Strips.y[i][0]} && y <= ${Strips.y[i][1]}  ) vtc = vec4(1.0,1.0,1.0,1.0); `;
                } else if (Array.isArray(Strips.x[i]) && !Array.isArray(Strips.y[i])) {
                    content += `if (x >= ${Strips.x[i][0]} && x <= ${Strips.x[i][1]} && y == ${Strips.y[i]} ) vtc = vec4(1.0,1.0,1.0,1.0); `;
                } else if (!Array.isArray(Strips.x[i]) && Array.isArray(Strips.y[i])) {
                    content += `if ( x == ${Strips.x[i]} && y >= ${Strips.y[i][0]} && y <= ${Strips.y[i][1]} ) vtc = vec4(1.0,1.0,1.0,1.0); `;
                } else {
                    content += `if ( x == ${Strips.x[i]} && y == ${Strips.y[i]} ) vtc = vec4(1.0,1.0,1.0,1.0); `;
                }
            }
            var blob = new Blob([content], { type: "text/plain;charset=utf-8" });
            zipButton.addEventListener("click", saveZip, false);
            zipButton.style.display = "flex";
            var fsh = `#version 150\n#moj_import <fog.glsl>\n  \n  \nuniform sampler2D Sampler0;\nuniform vec4 ColorModulator;\nuniform float FogStart;\nuniform float FogEnd;\nuniform vec4 FogColor;\n\nin float vertexDistance;\nin vec4 vertexColor;\nin vec2 texCoord0;\nin vec4 normal;\nout vec4 fragColor;\n\nvoid main() \n  {\n  int x = int(texCoord0.x * ${imgData.width});\n  int y = int(texCoord0.y * ${imgData.height});\n  vec4 vtc = vertexColor;\n  \n  ${content}\n\n  vec4 color = texture(Sampler0, texCoord0) * vtc * ColorModulator;\n  fragColor = linear_fog(color, vertexDistance, FogStart, FogEnd, FogColor);\n  }`;
            cm.setValue(fsh);
            imgLoaded = true;
        }
        img.src = event.target.result;
    }
    reader.readAsDataURL(e.target.files[0]);
}

document.querySelectorAll('input[name="shaderType"]').forEach((elem) => {
    elem.addEventListener('change', function (event) {
        var fsh;
        var item = event.target.value;
        let question2 = document.getElementById("question2");
        if (imgLoaded == true) {
            if (item == "rendertype_solid") {
                fsh = `#version 150\n#moj_import <fog.glsl>\n  \n  \nuniform sampler2D Sampler0;\nuniform vec4 ColorModulator;\nuniform float FogStart;\nuniform float FogEnd;\nuniform vec4 FogColor;\n\nin float vertexDistance;\nin vec4 vertexColor;\nin vec2 texCoord0;\nin vec4 normal;\nout vec4 fragColor;\n\nvoid main() \n  {\n  int x = int(texCoord0.x * ${imgData.width});\n  int y = int(texCoord0.y * ${imgData.height});\n  vec4 vtc = vertexColor;\n  \n  ${content}\n\n  vec4 color = texture(Sampler0, texCoord0) * vtc * ColorModulator;\n  fragColor = linear_fog(color, vertexDistance, FogStart, FogEnd, FogColor);\n  }`;
                cm.setValue(fsh);
            } else if (item == "rendertype_entity_cutout") {
                content = content.split("vtc = vec4(1.0,1.0,1.0,1.0);").join("flag = true;");
                fsh = `#version 150\n#moj_import <fog.glsl>\n\n  \nuniform sampler2D Sampler0;\nuniform vec4 ColorModulator;\nuniform float FogStart;\nuniform float FogEnd;\nuniform vec4 FogColor;\n\nin float vertexDistance;\nin vec4 vertexColor;\nin vec4 lightMapColor;\nin vec4 overlayColor;\nin vec2 texCoord0;\nin vec4 normal;\n\nout vec4 fragColor;\nvoid main()\n{\n  int x = int(texCoord0.x * ${imgData.width});\n  int y = int(texCoord0.y * ${imgData.height});\n  vec4 color = texture(Sampler0, texCoord0);\n  vec4 vtc = vertexColor;\n  bool flag = false;\n  ${content}\n  if (flag) {\n    vtc = vec4(1.0,1.0,1.0,1.0);\n    color *= vtc * ColorModulator; \n    if (color.a < 0.1)\n    {\n      discard;\n    }\n    color.rgb = mix(overlayColor.rgb, color.rgb, overlayColor.a); \n    fragColor = color, vertexDistance, FogStart, FogEnd, FogColor;\n  } else {\n    color *= vtc * ColorModulator;\n    if (color.a < 0.1) {\n      discard;\n    }\n    color.rgb = mix(overlayColor.rgb, color.rgb, overlayColor.a);\n    color *= lightMapColor;\n    fragColor = linear_fog(color, vertexDistance, FogStart, FogEnd, FogColor);\n  }\n}`
                cm.setValue(fsh);
            }
        } else {
            modalAppear("Please upload an atlas picture first",true,"20%","10%");
            document.getElementById('defaultShaderTemplate').checked = true;
        }
        if (item == "other" && imgLoaded == true) {
            if (question2.classList.contains("invisible")) {
                question2.classList.remove("invisible");
                question2.classList.add("fadein");
            }
            setTimeout(() => {
                let question2 = document.getElementById("question2");
                question2.classList.remove("fadein");
                question2.classList.remove("invisible");
            }, 100)
        } else {
            if (!question2.classList.contains("invisible")) question2.classList.add("fadeout");
            setTimeout(() => {
                let question2 = document.getElementById("question2");
                question2.classList.remove("fadeout");
                question2.classList.add("invisible");
            }, 100)
        }
    })
})


function saveZip() {
    let packmcmeta = '{"pack":{ "pack_format": 7, "description": "§cEmissive Textures by Ancientkingg"}}';
    zip.file('pack.mcmeta', packmcmeta);
    let shaderType = document.querySelector('input[name="shaderType"]:checked').value;
    if (shaderType = "other") shaderType = document.getElementById('shaderName').value
    let shaderContents = cm.getValue();
    zip.file('assets/minecraft/shaders/core/' + shaderType + '.fsh', shaderContents);
    zip.generateAsync({ type: 'blob' }).then(function (blob) {
        saveAs(blob, "EmissiveTextures-" + Math.floor(Math.random() * 100000) + ".zip");
    })
}

function column(Strips) {
    let ranges = { x: [], y: [] },
        rstart,
        rend;
    for (let i = 0; i < Strips.y.length; i++) {
        rstart = Strips.y[i];
        rend = rstart;
        while (Strips.y[i + 1] - Strips.y[i] == 1 && Strips.x[i + 1].toString() == Strips.x[i].toString()) {

            rend = Strips.y[i + 1]; // increment the index if the numbers sequential and Y is the same
            i++;
        }
        if (rstart == rend) {
            ranges.y.push(rstart);
        } else {
            ranges.y.push([rstart, rend]);
        }
        ranges.x.push(Strips.x[i])
        // ranges.x.push(rstart == rend ? rstart + "" : rstart + "-" + rend);
    }
    return ranges;
}

function strips(arrX, arrY) {
    let ranges = { x: [], y: [] },
        rstart,
        rend;
    for (let i = 0; i < arrX.length; i++) {
        rstart = arrX[i];
        rend = rstart;
        while (arrX[i + 1] - arrX[i] == 1 && arrY[i + 1] == arrY[i]) {
            rend = arrX[i + 1]; // increment the index if the numbers sequential and Y is the same
            i++;
        }
        if (rstart == rend) {
            ranges.x.push(rstart);
        } else {
            ranges.x.push([rstart, rend]);
        }
        ranges.y.push(arrY[i])
        // ranges.x.push(rstart == rend ? rstart + "" : rstart + "-" + rend);
    }
    return ranges;
}
