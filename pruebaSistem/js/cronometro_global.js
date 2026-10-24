window.iniciarCronometroGlobal = function(tiempoTotalSegundosporDefecto) {
    var elementoTiempo = document.getElementById("tiempo");
    if (!elementoTiempo) return;

    // Usar la llave dinámica por evaluación generada en coordinador_test.js
    var claveTiempoEval = window.CLAVE_TIEMPO_EVAL || "shyplay_bateria_tiempo_general";

    var ahora = Date.now();
    var tiempoFin = localStorage.getItem(claveTiempoEval);

    // Si no existe una marca de fin registrada (test nuevo), se calcula sumando los 1500 segundos (25 min)
    if (!tiempoFin) {
        tiempoFin = ahora + (tiempoTotalSegundosporDefecto * 1000);
        localStorage.setItem(claveTiempoEval, tiempoFin);
    } else {
        tiempoFin = parseInt(tiempoFin, 10);
    }

    function actualizarReloj() {
        var tiempoActual = Date.now();
        var milisegundosRestantes = tiempoFin - tiempoActual;
        var segundosRestantes = Math.floor(milisegundosRestantes / 1000);

        if (segundosRestantes <= 0) {
            segundosRestantes = 0;
        }

        var minutos = Math.floor(segundosRestantes / 60);
        var segundos = segundosRestantes % 60;

        elementoTiempo.textContent = (minutos < 10 ? "0" : "") + minutos + ":" + (segundos < 10 ? "0" : "") + segundos;

        return segundosRestantes;
    }

    // Ejecutar de inmediato al cargar la vista
    var segundosRestantes = actualizarReloj();

    var intervalo = setInterval(function() {
        segundosRestantes = actualizarReloj();

        if (segundosRestantes <= 0) {
            clearInterval(intervalo);
            localStorage.removeItem(claveTiempoEval);
            alert("¡El tiempo de la evaluación ha terminado!");
            if (typeof window.finalizarBateria === "function") {
                window.finalizarBateria();
            } else {
                window.location.href = "login.html";
            }
        }
    }, 1000);
};