document.addEventListener("DOMContentLoaded", function () {
    // Definimos el tiempo global en segundos según la combinación (Ej: 25 minutos = 1500 segundos)
    var tiempoTotalSegundos = 1500;
    var tiempoGuardado = sessionStorage.getItem("shyplay_bateria_tiempo");

    if (tiempoGuardado !== null) {
        tiempoTotalSegundos = parseInt(tiempoGuardado, 10);
    }

    var elemTiempo = document.getElementById("tiempo");

    function actualizarReloj() {
        var minutos = String(Math.floor(tiempoTotalSegundos / 60)).padStart(2, "0");
        var segundos = String(tiempoTotalSegundos % 60).padStart(2, "0");
        if (elemTiempo) elemTiempo.textContent = minutos + ":" + segundos;

        sessionStorage.setItem("shyplay_bateria_tiempo", tiempoTotalSegundos);

        if (tiempoTotalSegundos <= 0) {
            alert("El tiempo de la prueba ha finalizado.");
            // Disparar función de cierre global
            if (typeof finalizarBateria === "function") {
                finalizarBateria();
            }
            return;
        }

        tiempoTotalSegundos -= 1;
        window.setTimeout(actualizarReloj, 1000);
    }

    actualizarReloj();
});