window.iniciarCronometroGlobal = function(segundosIniciales) {
    var tiempoTotalSegundos = segundosIniciales || 1500;
    var tiempoGuardado = sessionStorage.getItem("shyplay_bateria_tiempo");

    if (tiempoGuardado !== null) {
        tiempoTotalSegundos = parseInt(tiempoGuardado, 10);
    } else {
        sessionStorage.setItem("shyplay_bateria_tiempo", tiempoTotalSegundos);
    }

    var elemTiempo = document.getElementById("tiempo");

    function actualizarReloj() {
        var minutos = String(Math.floor(tiempoTotalSegundos / 60)).padStart(2, "0");
        var segundos = String(tiempoTotalSegundos % 60).padStart(2, "0");
        if (elemTiempo) elemTiempo.textContent = minutos + ":" + segundos;

        sessionStorage.setItem("shyplay_bateria_tiempo", tiempoTotalSegundos);

        if (tiempoTotalSegundos <= 0) {
            alert("El tiempo de la prueba ha finalizado.");
            sessionStorage.setItem("shyplay_bateria_tiempo_terminado", "true");
            if (typeof finalizarBateria === "function") {
                finalizarBateria();
            }
            return;
        }

        tiempoTotalSegundos -= 1;
        window.setTimeout(actualizarReloj, 1000);
    }

    // Arranca el conteo
    actualizarReloj();
};