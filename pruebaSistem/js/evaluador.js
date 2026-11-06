document.addEventListener("DOMContentLoaded", () => {
    const btnBuscar = document.getElementById("btn-buscar-candidato");
    const inputCorreo = document.getElementById("input-correo-buscar");
    const divInfoCandidato = document.getElementById("info-candidato");
    const lblNombre = document.getElementById("lbl-nombre-candidato");
    const lblCorreo = document.getElementById("lbl-correo-candidato");
    const inputIdCandidato = document.getElementById("id-candidato-encontrado");
    const seccionBateria = document.getElementById("seccion-bateria");
    const formAsignar = document.getElementById("form-asignar-prueba");
    const selectBateria = document.getElementById("select-bateria");

    // Obtener el nombre del evaluador desde la sesión actual (o dejar "Admin" por defecto)
    let sesion = null;
    try {
        sesion = JSON.parse(sessionStorage.getItem("shyplay_sesion") || "null");
    } catch (e) {
        sesion = null;
    }
    const nombreEvaluador = sesion && sesion.usuario ? sesion.usuario : "Admin";

    //EVENTO BUSCAR CANDIDATO (GET /api/evaluacion/buscar)
    btnBuscar.addEventListener("click", async () => {
        const correo = inputCorreo.value.trim();
        if (!correo) {
            alert("Por favor, ingresa un correo electrónico.");
            return;
        }

        try {
            const response = await fetch(`https://sistema-psicometrico-back-7.onrender.com/api/evaluacion/buscar?correo=${encodeURIComponent(correo)}`);
            const data = await response.json();

            if (data.encontrado) {
                lblNombre.textContent = `${data.nombre} ${data.apellido}`;
                lblCorreo.textContent = data.correo;
                inputIdCandidato.value = data.id_candidato;

                divInfoCandidato.style.display = "block";

                // Activar la sección de la batería de pruebas
                seccionBateria.style.opacity = "1";
                seccionBateria.style.pointerEvents = "auto";
            } else {
                alert("Candidato no encontrado con ese correo.");
                divInfoCandidato.style.display = "none";
                seccionBateria.style.opacity = "0.5";
                seccionBateria.style.pointerEvents = "none";
            }
        } catch (error) {
            console.error("Error al buscar candidato:", error);
            alert("Error de conexión con el servidor backend.");
        }
    });

    //EVENTO ASIGNAR Y GUARDAR (POST /api/evaluacion/asignar)
    formAsignar.addEventListener("submit", async (e) => {
        e.preventDefault();

        const idCandidatoFk = parseInt(inputIdCandidato.value);
        const combinacion = selectBateria.value;

        if (!idCandidatoFk) {
            alert("Primero debes seleccionar un candidato válido.");
            return;
        }

        const payload = {
            id_candidato_fk: idCandidatoFk,
            combinacion: combinacion,
            nombre_evaluador: nombreEvaluador
        };

        try {
            const response = await fetch("https://sistema-psicometrico-back-7.onrender.com/api/evaluacion/asignar", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (data.exito) {
                            alert("¡Evaluación programada correctamente!");

                            // >>> ¡AQUÍ ESTABA EL DETALLE! Guardar en el sessionStorage la combinación elegida <<<
                            sessionStorage.setItem("shyplay_bateria_combinacion", combinacion);

                            // Limpiar formulario o recargar
                            formAsignar.reset();
                            divInfoCandidato.style.display = "none";
                            inputCorreo.value = "";
                            seccionBateria.style.opacity = "0.5";
                            seccionBateria.style.pointerEvents = "none";
                        } else {
                alert("Error al guardar: " + (data.mensaje || "Desconocido"));
            }
        } catch (error) {
            console.error("Error al asignar evaluación:", error);
            alert("Error de conexión al intentar guardar la evaluación.");
        }
    });
});