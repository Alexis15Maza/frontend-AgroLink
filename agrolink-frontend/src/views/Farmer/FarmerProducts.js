import React, { useState, useRef, useEffect } from "react";
import {
  listarCultivos,
  registrarCultivo,
  actualizarCultivo,
  eliminarCultivo,
  listarProductos,
  listarVariedadesPorProducto,
  registrarMerma,
} from "../../api/agricultorService";

import CultivoTimeline from "./Cultivotimeline"

// --- Funciones Auxiliares ---
const addDaysToDate = (dateStr, days) => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "";
  date.setMinutes(date.getMinutes() + date.getTimezoneOffset());
  date.setDate(date.getDate() + parseInt(days || 0, 10));
  return date.toISOString().split("T")[0];
};

const formatDateDisplay = (dateStr) => {
  if (!dateStr) return "---";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

// Mapear estadoCultivo del backend a datos visuales del frontend
const mapearEstadoVisual = (estadoCultivo, diasTotales, fechaSiembra) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(fechaSiembra);
  start.setMinutes(start.getMinutes() + start.getTimezoneOffset());
  const daysElapsed = Math.max(
    0,
    Math.floor((today - start) / (1000 * 60 * 60 * 24)),
  );
  const totalDays = diasTotales || 1;
  const progress = Math.min(100, Math.round((daysElapsed / totalDays) * 100));
  const daysLeft = Math.max(0, totalDays - daysElapsed);

      if (estadoCultivo === "Listo para cosechar") {
        return {
            stage: "Listo para vender",  // ← lo que muestra el front
            progress: 100,
            isCosechado: true,
            daysLeft: 0,
        };
    } else if (estadoCultivo === "En crecimiento") {
        return { stage: "En Crecimiento", progress, isCosechado: false, daysLeft };
    } else {
        // "Recién cultivado" o cualquier otro
        return {
            stage: "Recién Cultivado",
            progress,
            isCosechado: false,
            daysLeft,
        };
    }
};

const calcularAlerta20 = (fechaSiembra, diasTotalesEstimados) => {
  if (!fechaSiembra || !diasTotalesEstimados) return false;

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const inicio = new Date(fechaSiembra);
  inicio.setMinutes(inicio.getMinutes() + inicio.getTimezoneOffset());

  const diasTranscurridos = Math.floor((hoy - inicio) / (1000 * 60 * 60 * 24));
  const umbral = diasTotalesEstimados * 1.2;

  return diasTranscurridos > umbral;
};

// Convertir CultivoResponse del backend al formato que usa el JSX
const mapearResponseACrop = (c) => ({
  id: c.id,
  nombre: c.nombreProducto && c.nombreProductoVariedad 
    ? `${c.nombreProducto} ${c.nombreProductoVariedad}`
    : c.nombreProductoVariedad || "Sin nombre",
  variedad: "",
  lote: c.lote || "---",
  hectareas: c.areaSembrada ? c.areaSembrada.toString() : "",
  cantidadTotal: c.cantidadEstimada
    ? `${c.cantidadEstimada} ${c.unidad || "Kg"}`
    : "---",
  cantidadDisponible: c.cantidadDisponible != null
    ? `${c.cantidadDisponible} ${c.unidad || "Kg"}`
    : "---",
  stockTotalRestante: c.stockTotalRestante != null
    ? `${c.stockTotalRestante} ${c.unidad || "Kg"}`
    : "---",
  fechaSiembra: c.fechaSiembra,
  precio: c.precio ? c.precio.toString() : "0",
  minimoVenta: c.minimoVenta ? `${c.minimoVenta} Kg` : "0 Kg",
  imagen:
    c.imagenUrl ||
    "https://images.unsplash.com/photo-1592417817098-8f3d6eb19675?auto=format&fit=crop&q=80&w=600",
  incidencia: c.alertaRetraso || false,
  estadoCultivo: c.estadoCultivo,
  diasTotalesEstimados: c.diasTotalesEstimados || 70,
  idProductoVariedad: c.idProductoVariedad,
  // Guardamos etapas como objeto ficticio basado en diasTotales para compatibilidad visual
  etapas: {
    germinacion: Math.round((c.diasTotalesEstimados || 70) * 0.14),
    crecimiento: Math.round((c.diasTotalesEstimados || 70) * 0.43),
    floracion: Math.round((c.diasTotalesEstimados || 70) * 0.21),
    maduracion: Math.round((c.diasTotalesEstimados || 70) * 0.22),
  },
});

function FarmerProducts() {
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [formMode, setFormMode] = useState("create");
  const [editCropId, setEditCropId] = useState(null);
  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [productos, setProductos] = useState([]);
  const [variedades, setVariedades] = useState([]);
  const [loadingVariedades, setLoadingVariedades] = useState(false);

  const [mermaData, setMermaData] = useState({
    cantidadPerdida: "",
    causa: "",
    observacion: "",
  });
  const defaultFormData = {
    idProducto: "",
    idProductoVariedad: "",
    nombreProducto: "",
    nombreVariedad: "",
    lote: "",
    hectareas: "",
    cantidadEstimada: "",
    unidad: "Kg",
    fechaSiembra: new Date().toISOString().split("T")[0],
    precio: "",
    minimoVenta: "",
    etapas: { germinacion: 10, crecimiento: 30, floracion: 15, maduracion: 15 },
  };

  const [formData, setFormData] = useState(defaultFormData);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);
  const [editingCrop, setEditingCrop] = useState(null);
  const [incidentData, setIncidentData] = useState({
    tipo: "",
    descripcion: "",
  });

  // --- CARGAR CULTIVOS DEL BACKEND ---
  useEffect(() => {
    cargarCultivos();
  }, []);

  const cargarCultivos = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await listarCultivos();
      console.log("Cultivos:", data);
      setCrops(data.map(mapearResponseACrop));
    } catch (err) {
      setError("No se pudieron cargar los cultivos. Verifica tu conexión.");
    } finally {
      setLoading(false);
    }
  };

  // --- NAVEGACIÓN ---
  const openCreateForm = () => {
    setFormData(defaultFormData);
    setImagePreview(null);
    setFormMode("create");
    setEditCropId(null);
    setIsFormVisible(true);
  };

  const openFullEditForm = async (crop) => {
    const qtyParts = (crop.cantidadTotal || "").split(" ");
    const cantEst = qtyParts[0] || "";
    const uni =
      qtyParts.length > 1 && qtyParts[1].includes("Ton") ? "Toneladas" : "Kg";

    // Cargar variedades del producto si existe idProductoVariedad
    if (crop.idProductoVariedad) {
      try {
        // Buscar el producto de esta variedad
        const todasVariedades = await Promise.all(
          productos.map((p) => listarVariedadesPorProducto(p.id)),
        );
        const productoIndex = todasVariedades.findIndex((vars) =>
          vars.some((v) => v.id === crop.idProductoVariedad),
        );
        if (productoIndex !== -1) {
          setVariedades(todasVariedades[productoIndex]);
          setFormData({
            idProducto: productos[productoIndex].id.toString(),
            idProductoVariedad: crop.idProductoVariedad.toString(),
            lote: crop.lote,
            hectareas: crop.hectareas || "",
            cantidadEstimada: cantEst,
            unidad: uni,
            fechaSiembra: crop.fechaSiembra,
            precio: crop.precio,
            minimoVenta: (crop.minimoVenta || "").replace(/[^0-9]/g, ""),
            etapas: { ...crop.etapas },
          });
        }
      } catch (err) {
        console.error("Error cargando variedad al editar:", err);
      }
    }

    setImagePreview(crop.imagen);
    setFormMode("edit");
    setEditCropId(crop.id);
    setIsFormVisible(true);
  };

  // --- HANDLERS FORMULARIO ---
  const handleInputChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });
  const handleEtapaChange = (e) =>
    setFormData({
      ...formData,
      etapas: { ...formData.etapas, [e.target.name]: e.target.value },
    });
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setSaving(true);

    const totalDias =
      parseInt(formData.etapas.germinacion || 0) +
      parseInt(formData.etapas.crecimiento || 0) +
      parseInt(formData.etapas.floracion || 0) +
      parseInt(formData.etapas.maduracion || 0);

    // Armar el payload que espera el backend
    const payload = {
      fechaSiembra: formData.fechaSiembra,
      areaSembrada: parseFloat(formData.hectareas) || 0,
      diasTotalesEstimados: totalDias,
      lote: formData.lote,
      precio: parseFloat(formData.precio) || 0,
      minimoVenta: parseFloat(formData.minimoVenta) || 0,
      cantidadEstimada: parseFloat(formData.cantidadEstimada) || 0,
      unidad: formData.unidad,
      imagenUrl: imagePreview || null,
      idProductoVariedad: parseInt(formData.idProductoVariedad) || null, // ← nuevo
    };

    try {
      if (formMode === "create") {
        await registrarCultivo(payload);
        alert("¡Cultivo registrado exitosamente!");
      } else {
        await actualizarCultivo(editCropId, payload);
        alert("¡Cultivo actualizado exitosamente!");
      }
      await cargarCultivos(); // recargar lista desde el backend
      setIsFormVisible(false);
    } catch (err) {
      const msg = err.response?.data?.message || "Error al guardar el cultivo.";
      alert(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCrop = async () => {
    if (
      !window.confirm(
        "¿Está seguro de que desea eliminar este cultivo permanentemente?",
      )
    )
      return;
    try {
      await eliminarCultivo(editCropId);
      await cargarCultivos();
      setIsFormVisible(false);
    } catch (err) {
      const msg =
        err.response?.data?.message || "Error al eliminar el cultivo.";
      alert(msg);
    }
  };

  useEffect(() => {
    const cargarProductos = async () => {
      try {
        const data = await listarProductos();
        setProductos(data);
      } catch (err) {
        console.error("Error cargando productos:", err);
      }
    };
    cargarProductos();
  }, []);

  const handleGuardarMerma = async () => {
    if (!mermaData.cantidadPerdida || mermaData.cantidadPerdida <= 0) {
      alert("Ingresa una cantidad válida.");
      return;
    }
    if (!mermaData.causa) {
      alert("Ingresa la causa de la merma.");
      return;
    }

    try {
      await registrarMerma(editingCrop.id, {
        cantidadPerdida: parseFloat(mermaData.cantidadPerdida),
        causa: mermaData.causa,
        observacion: mermaData.observacion,
      });
      alert("Merma registrada correctamente. Stock actualizado.");
      setMermaData({ cantidadPerdida: "", causa: "", observacion: "" });
      await cargarCultivos();
      setEditingCrop(null);
    } catch (err) {
      alert(err.response?.data?.message || "Error al registrar la merma.");
    }
  };

  const handleProductoChange = async (e) => {
    const idProducto = e.target.value;
    const productoSeleccionado = productos.find(
      (p) => p.id === parseInt(idProducto),
    );

    setFormData({
      ...formData,
      idProducto,
      nombreProducto: productoSeleccionado?.nombre || "",
      idProductoVariedad: "",
      nombreVariedad: "",
    });

    if (idProducto) {
      setLoadingVariedades(true);
      try {
        const data = await listarVariedadesPorProducto(idProducto);
        setVariedades(data);
      } catch (err) {
        console.error("Error cargando variedades:", err);
      } finally {
        setLoadingVariedades(false);
      }
    } else {
      setVariedades([]);
    }
  };

  const handleVariedadChange = (e) => {
    const idVariedad = e.target.value;
    const variedadSeleccionada = variedades.find(
      (v) => v.id === parseInt(idVariedad),
    );
    setFormData({
      ...formData,
      idProductoVariedad: idVariedad,
      nombreVariedad: variedadSeleccionada?.nombre || "",
    });
  };

  // --- MODAL DE GESTIÓN ---
  // Nota: el modal de gestión actualiza diasTotalesEstimados en el backend
  const openGestionModal = (crop) => {
    setEditingCrop({ ...crop, etapas: { ...crop.etapas } });
    setIncidentData({ tipo: "", descripcion: "" });
  };

  const handleEditEtapaModalChange = (e) => {
    setEditingCrop({
      ...editingCrop,
      etapas: { ...editingCrop.etapas, [e.target.name]: e.target.value },
    });
  };

  const saveGestionChanges = async () => {
    const totalDias =
      parseInt(editingCrop.etapas.germinacion || 0) +
      parseInt(editingCrop.etapas.crecimiento || 0) +
      parseInt(editingCrop.etapas.floracion || 0) +
      parseInt(editingCrop.etapas.maduracion || 0);

    try {
      await actualizarCultivo(editingCrop.id, {
        fechaSiembra: editingCrop.fechaSiembra,
        areaSembrada: parseFloat(editingCrop.hectareas) || 0,
        diasTotalesEstimados: totalDias,
        lote: editingCrop.lote,
        precio: parseFloat(editingCrop.precio) || 0,
        minimoVenta:
          parseFloat((editingCrop.minimoVenta || "").replace(/[^0-9.]/g, "")) ||
          0,
        cantidadEstimada:
          parseFloat((editingCrop.cantidadTotal || "").split(" ")[0]) || 0,
        unidad: (editingCrop.cantidadTotal || "").split(" ")[1] || "Kg",
        imagenUrl: editingCrop.imagen || null,
      });

      if (incidentData.tipo !== "") {
        alert(`Notificación enviada a los compradores: [${incidentData.tipo}]`);
      } else {
        alert("Tiempos de cultivo actualizados correctamente.");
      }

      await cargarCultivos();
      setEditingCrop(null);
    } catch (err) {
      alert("Error al guardar los cambios.");
    }
  };

  // --- RENDERS ---

  const renderListView = () => {
    if (loading)
      return (
        <div
          style={{
            textAlign: "center",
            padding: "60px",
            color: "#888",
            fontSize: "1.1rem",
          }}
        >
          ⏳ Cargando cultivos...
        </div>
      );
    if (error)
      return (
        <div style={{ textAlign: "center", padding: "60px" }}>
          <p style={{ color: "#d32f2f", fontWeight: "bold" }}>{error}</p>
          <button
            onClick={cargarCultivos}
            style={{
              marginTop: "15px",
              padding: "10px 20px",
              backgroundColor: "var(--color-primary)",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            🔄 Reintentar
          </button>
        </div>
      );

    return (
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "30px",
            flexWrap: "wrap",
            gap: "15px",
          }}
        >
          <div>
            <h2
              style={{
                color: "var(--color-primary)",
                fontFamily: "var(--font-titles)",
                margin: "0 0 10px 0",
                fontSize: "2rem",
              }}
            >
              Mis Cultivos
            </h2>
            <p style={{ color: "#555", fontSize: "1.1rem", margin: 0 }}>
              Gestiona tus siembras actuales y reporta incidencias.
            </p>
          </div>
          <button
            onClick={openCreateForm}
            style={{
              backgroundColor: "var(--color-secondary)",
              color: "white",
              border: "none",
              padding: "12px 24px",
              borderRadius: "var(--radius-md)",
              fontWeight: "bold",
              cursor: "pointer",
              boxShadow: "0 4px 6px rgba(255,152,0,0.2)",
              fontSize: "1rem",
              transition: "0.2s",
            }}
          >
            + Registrar Nueva Siembra
          </button>
        </div>

        {crops.length === 0 ? (
          <div
            style={{ textAlign: "center", padding: "80px 20px", color: "#888" }}
          >
            <div style={{ fontSize: "3rem", marginBottom: "15px" }}>🌱</div>
            <p style={{ fontSize: "1.1rem" }}>
              Aún no tienes cultivos registrados.
            </p>
            <button
              onClick={openCreateForm}
              style={{
                marginTop: "15px",
                padding: "12px 24px",
                backgroundColor: "var(--color-primary)",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              Registrar mi primer cultivo
            </button>
          </div>
        ) : (
          <div className="farmer-crops-grid">
            {crops.map((crop) => {
              const stageData = mapearEstadoVisual(
                crop.estadoCultivo,
                crop.diasTotalesEstimados,
                crop.fechaSiembra,
              );
              const harvestDate = formatDateDisplay(
                addDaysToDate(crop.fechaSiembra, crop.diasTotalesEstimados),
              );
              const hayRetraso = calcularAlerta20(
                crop.fechaSiembra,
                crop.diasTotalesEstimados,
              );

              return (
                <div
                  key={crop.id}
                  style={{
                    backgroundColor: "white",
                    borderRadius: "var(--radius-lg)",
                    overflow: "hidden",
                    boxShadow:
                      hayRetraso || crop.incidencia
                        ? "0 0 0 2px #d32f2f, 0 4px 15px rgba(211,47,47,0.15)"
                        : "0 4px 15px rgba(0,0,0,0.06)",
                    transition: "transform 0.2s",
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      height: "180px",
                      backgroundImage: `url(${crop.imagen})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      position: "relative",
                    }}
                  >
                    {hayRetraso && (
                      <div
                        style={{
                          position: "absolute",
                          top: "15px",
                          left: "15px",
                          backgroundColor: "#d32f2f",
                          color: "white",
                          padding: "6px 12px",
                          borderRadius: "20px",
                          fontSize: "0.85rem",
                          fontWeight: "bold",
                        }}
                      >
                        ⚠️ Retraso +20%
                      </div>
                    )}

                    {crop.incidencia ? (
                      <div
                        style={{
                          position: "absolute",
                          top: "15px",
                          right: "15px",
                          backgroundColor: "#d32f2f",
                          color: "white",
                          padding: "6px 12px",
                          borderRadius: "20px",
                          fontSize: "0.85rem",
                          fontWeight: "bold",
                        }}
                      >
                        ⚠️ Problema Reportado
                      </div>
                    ) : (
                      <div
                        style={{
                          position: "absolute",
                          top: "15px",
                          right: "15px",
                          backgroundColor: stageData.isCosechado
                            ? "#2E7D32"
                            : "var(--color-secondary)",
                          color: "white",
                          padding: "6px 12px",
                          borderRadius: "20px",
                          fontSize: "0.85rem",
                          fontWeight: "bold",
                        }}
                      >
                        {stageData.isCosechado
                        ? "📦 Listo"
                        : stageData.stage === "En Crecimiento"
                            ? "🌿 En Crecimiento"
                            : "🌱 Recién Cultivado"}
                      </div>
                    )}
                  </div>{" "}
                  {/* ← este cierre es importante */}
                  <div
                    style={{
                      width: "100%",
                      height: "6px",
                      backgroundColor: "#e0e0e0",
                    }}
                  >
                    <div
                      style={{
                        width: `${stageData.progress}%`,
                        height: "100%",
                        backgroundColor: crop.incidencia
                          ? "#d32f2f"
                          : stageData.isCosechado
                            ? "#2E7D32"
                            : "var(--color-primary)",
                        transition: "width 0.5s ease-in-out",
                      }}
                    ></div>
                  </div>
                  <div style={{ padding: "20px" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            color: "#888",
                            fontSize: "0.85rem",
                            marginBottom: "5px",
                            fontWeight: "bold",
                          }}
                        >
                          LOTE: {crop.lote}
                        </div>
                        <h3
                          style={{
                            margin: "0 0 10px 0",
                            color: "var(--color-text)",
                            fontSize: "1.3rem",
                          }}
                        >
                          {crop.nombre}
                        </h3>
                      </div>
                      <button
                        onClick={() => openFullEditForm(crop)}
                        style={{
                          background: "transparent",
                          border: "none",
                          cursor: "pointer",
                          fontSize: "1.2rem",
                          padding: "5px",
                        }}
                        title="Editar"
                      >
                        ✏️
                      </button>
                    </div>

                    <div
                      style={{
                        backgroundColor: crop.incidencia
                          ? "#ffebee"
                          : "#F4F7F5",
                        padding: "10px",
                        borderRadius: "var(--radius-sm)",
                        marginBottom: "15px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: "5px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "0.9rem",
                            color: "#555",
                            fontWeight: "bold",
                          }}
                        >
                          Fase actual:
                        </span>
                        <span
                          style={{
                            fontSize: "0.9rem",
                            color: crop.incidencia
                              ? "#d32f2f"
                              : stageData.isCosechado
                                ? "#2E7D32"
                                : "var(--color-secondary)",
                            fontWeight: "bold",
                          }}
                        >
                          {stageData.stage}
                        </span>
                      </div>
                      {!stageData.isCosechado && (
                        <div
                          style={{
                            fontSize: "0.8rem",
                            color: crop.incidencia ? "#d32f2f" : "#777",
                            textAlign: "right",
                          }}
                        >
                          Faltan {stageData.daysLeft} días para cosecha
                        </div>
                      )}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "8px",
                        fontSize: "0.95rem",
                      }}
                    >
                      <span style={{ color: "#666" }}>Disponible:</span>
                      <strong style={{ color: "var(--color-primary)" }}>
                        {crop.cantidadDisponible} / {crop.cantidadTotal}
                      </strong>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "20px",
                        fontSize: "0.95rem",
                      }}
                    >
                      <span style={{ color: "#666" }}>Fecha Est. Cosecha:</span>
                      <strong style={{ color: "#333" }}>{harvestDate}</strong>
                    </div>

                    <div
                      style={{
                        borderTop: "1px solid #eee",
                        paddingTop: "15px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div
                        style={{
                          color: "var(--color-secondary)",
                          fontWeight: "bold",
                          fontSize: "1.15rem",
                        }}
                      >
                        S/ {crop.precio}
                      </div>
                      <button
                        onClick={() => openGestionModal(crop)}
                        style={{
                          background: "var(--color-primary)",
                          color: "white",
                          border: "none",
                          borderRadius: "5px",
                          padding: "8px 15px",
                          cursor: "pointer",
                          fontWeight: "bold",
                        }}
                      >
                        Gestionar ⚙️
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderFormView = () => {
    const totalDaysForm =
      parseInt(formData.etapas.germinacion || 0) +
      parseInt(formData.etapas.crecimiento || 0) +
      parseInt(formData.etapas.floracion || 0) +
      parseInt(formData.etapas.maduracion || 0);
    const calculatedCosechaForm = addDaysToDate(
      formData.fechaSiembra,
      totalDaysForm,
    );

    let hasSales = false;
    if (formMode === "edit" && editCropId) {
      const activeCrop = crops.find((c) => c.id === editCropId);
      if (
        activeCrop &&
        activeCrop.cantidadDisponible !== activeCrop.cantidadTotal
      ) {
        hasSales = true;
      }
    }

    const inputStyle = {
      width: "100%",
      padding: "12px",
      borderRadius: "var(--radius-md)",
      border: "1px solid #ccc",
      fontSize: "1rem",
      backgroundColor: hasSales ? "#f5f5f5" : "white",
      cursor: hasSales ? "not-allowed" : "text",
      color: hasSales ? "#777" : "#000",
    };

    return (
      <div className="farmer-form-card">
        <div className="farmer-form-header">
          <div>
            <h2
              style={{
                color: "var(--color-primary)",
                margin: 0,
                fontSize: "1.8rem",
              }}
            >
              {formMode === "create"
                ? "Registrar Nueva Siembra"
                : "Editar Información del Cultivo"}
            </h2>
            {hasSales && (
              <p
                style={{
                  color: "#d32f2f",
                  fontWeight: "bold",
                  margin: "5px 0 0 0",
                  fontSize: "0.9rem",
                }}
              >
                🔒 Este cultivo ya tiene ventas. Algunos campos están
                bloqueados.
              </p>
            )}
          </div>
          <button
            onClick={() => setIsFormVisible(false)}
            style={{
              background: "transparent",
              border: "1px solid #ccc",
              color: "#555",
              padding: "8px 15px",
              borderRadius: "var(--radius-md)",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            ← Volver a Mis Cultivos
          </button>
        </div>

        <form onSubmit={handleSubmitForm}>
          <div className="farmer-form-grid-cols">
            {/* COLUMNA 1 */}
            <div>
              <h4
                style={{
                  color: "var(--color-secondary)",
                  borderBottom: "1px dashed #ccc",
                  paddingBottom: "8px",
                  marginBottom: "20px",
                }}
              >
                1. Información Básica
              </h4>

              <div className="farmer-form-row-grid">
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontWeight: "500",
                      color: "#333",
                    }}
                  >
                    Producto
                  </label>
                  <select
                    name="idProducto"
                    required
                    disabled={hasSales}
                    value={formData.idProducto}
                    onChange={handleProductoChange}
                    style={inputStyle}
                  >
                    <option value="">-- Selecciona un producto --</option>
                    {productos.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontWeight: "500",
                      color: "#333",
                    }}
                  >
                    Variedad
                  </label>
                  <select
                    name="idProductoVariedad"
                    required
                    disabled={
                      hasSales || !formData.idProducto || loadingVariedades
                    }
                    value={formData.idProductoVariedad}
                    onChange={handleVariedadChange}
                    style={inputStyle}
                  >
                    <option value="">
                      {loadingVariedades
                        ? "Cargando..."
                        : "-- Selecciona una variedad --"}
                    </option>
                    {variedades.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <h4
                style={{
                  color: "var(--color-secondary)",
                  borderBottom: "1px dashed #ccc",
                  paddingBottom: "8px",
                  marginBottom: "20px",
                }}
              >
                2. Producción
              </h4>
              <div style={{ marginBottom: "20px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: "500",
                    color: "#333",
                  }}
                >
                  Código de Lote Principal
                </label>
                <input
                  type="text"
                  name="lote"
                  required
                  disabled={hasSales}
                  value={formData.lote}
                  onChange={handleInputChange}
                  style={inputStyle}
                  placeholder="Ej. LOTE-MZD-2025"
                />
                <span
                  style={{
                    display: "block",
                    fontSize: "0.82rem",
                    color: "#666",
                    marginTop: "6px",
                    lineHeight: "1.4",
                  }}
                >
                  💡 Formato sugerido: LOTE-[ABREVIATURA]-[AÑO]
                </span>
              </div>
              <div className="farmer-form-row-grid">
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontWeight: "500",
                      color: "#333",
                    }}
                  >
                    Hectáreas Sembradas
                  </label>
                  <input
                    type="number"
                    name="hectareas"
                    min="0"
                    step="0.1"
                    required
                    disabled={hasSales}
                    value={formData.hectareas}
                    onChange={handleInputChange}
                    style={inputStyle}
                    placeholder="Ej. 5"
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontWeight: "500",
                      color: "#333",
                    }}
                  >
                    Cantidad Estimada
                  </label>
                  <div style={{ display: "flex" }}>
                    <input
                      type="number"
                      name="cantidadEstimada"
                      min="0"
                      required
                      disabled={hasSales}
                      value={formData.cantidadEstimada}
                      onChange={handleInputChange}
                      style={{
                        ...inputStyle,
                        width: "60%",
                        borderRadius: "var(--radius-md) 0 0 var(--radius-md)",
                        borderRight: "none",
                      }}
                      placeholder="Ej. 15"
                    />
                    <select
                      name="unidad"
                      disabled={hasSales}
                      value={formData.unidad}
                      onChange={handleInputChange}
                      style={{
                        ...inputStyle,
                        width: "40%",
                        borderRadius: "0 var(--radius-md) var(--radius-md) 0",
                      }}
                    >
                      <option value="Kg">Kg</option>
                      <option value="Toneladas">Ton</option>
                    </select>
                  </div>
                </div>
              </div>
              <h4
                style={{
                  color: "var(--color-secondary)",
                  borderBottom: "1px dashed #ccc",
                  paddingBottom: "8px",
                  marginBottom: "15px",
                }}
              >
                3. Etapas Agronómicas (Días)
              </h4>
              <div
                style={{
                  backgroundColor: "#F4F7F5",
                  padding: "20px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid #e0e0e0",
                  marginBottom: "25px",
                }}
              >
                <p
                  style={{
                    fontSize: "0.85rem",
                    color: "#666",
                    marginTop: 0,
                    marginBottom: "15px",
                  }}
                >
                  Para ajustes rápidos por clima o plagas, usa el botón
                  "Gestionar".
                </p>
                <div className="farmer-form-row-grid" style={{ marginBottom: 0 }}>
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "0.9rem",
                        color: "#555",
                      }}
                    >
                      Germinación
                    </label>
                    <input
                      type="number"
                      name="germinacion"
                      required
                      value={formData.etapas.germinacion}
                      onChange={handleEtapaChange}
                      style={{
                        width: "100%",
                        padding: "10px",
                        borderRadius: "5px",
                        border: "1px solid #ccc",
                      }}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "0.9rem",
                        color: "#555",
                      }}
                    >
                      Crec. Vegetativo
                    </label>
                    <input
                      type="number"
                      name="crecimiento"
                      required
                      value={formData.etapas.crecimiento}
                      onChange={handleEtapaChange}
                      style={{
                        width: "100%",
                        padding: "10px",
                        borderRadius: "5px",
                        border: "1px solid #ccc",
                      }}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "0.9rem",
                        color: "#555",
                      }}
                    >
                      Floración
                    </label>
                    <input
                      type="number"
                      name="floracion"
                      required
                      value={formData.etapas.floracion}
                      onChange={handleEtapaChange}
                      style={{
                        width: "100%",
                        padding: "10px",
                        borderRadius: "5px",
                        border: "1px solid #ccc",
                      }}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "0.9rem",
                        color: "#555",
                      }}
                    >
                      Maduración
                    </label>
                    <input
                      type="number"
                      name="maduracion"
                      required
                      value={formData.etapas.maduracion}
                      onChange={handleEtapaChange}
                      style={{
                        width: "100%",
                        padding: "10px",
                        borderRadius: "5px",
                        border: "1px solid #ccc",
                      }}
                    />
                  </div>
                </div>
                <div
                  style={{
                    marginTop: "15px",
                    textAlign: "right",
                    fontWeight: "bold",
                  }}
                >
                  Total:{" "}
                  <span style={{ color: "var(--color-primary)" }}>
                    {totalDaysForm} días
                  </span>
                </div>
              </div>
            </div>

            {/* COLUMNA 2 */}
            <div>
              <h4
                style={{
                  color: "var(--color-secondary)",
                  borderBottom: "1px dashed #ccc",
                  paddingBottom: "8px",
                  marginBottom: "20px",
                }}
              >
                4. Cálculo de Fechas Clave
              </h4>
              <div className="farmer-form-row-grid">
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontWeight: "500",
                      color: "#333",
                    }}
                  >
                    Fecha de Siembra
                  </label>
                  <input
                    type="date"
                    name="fechaSiembra"
                    required
                    value={formData.fechaSiembra}
                    onChange={handleInputChange}
                    style={{
                      width: "100%",
                      padding: "12px",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid #ccc",
                      fontFamily: "inherit",
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontWeight: "500",
                      color: "#333",
                    }}
                  >
                    Cosecha Proyectada
                  </label>
                  <input
                    type="date"
                    disabled
                    value={calculatedCosechaForm}
                    style={{
                      width: "100%",
                      padding: "12px",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid #e0e0e0",
                      backgroundColor: "#f5f5f5",
                      color: "#2E7D32",
                      fontWeight: "bold",
                    }}
                  />
                </div>
              </div>

              <h4
                style={{
                  color: "var(--color-secondary)",
                  borderBottom: "1px dashed #ccc",
                  paddingBottom: "8px",
                  marginBottom: "20px",
                }}
              >
                5. Comercialización
              </h4>
              <div className="farmer-form-row-grid">
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontWeight: "500",
                      color: "#333",
                    }}
                  >
                    Precio Unitario x 1 Kg (S/)
                  </label>
                  <input
                    type="number"
                    name="precio"
                    min="0.01"
                    step="0.01"
                    required
                    value={formData.precio}
                    onChange={handleInputChange}
                    style={{
                      width: "100%",
                      padding: "12px",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid #ccc",
                    }}
                    placeholder="Ej. 4.50"
                  />
                  <span
                    style={{
                      display: "block",
                      fontSize: "0.82rem",
                      color: "#666",
                      marginTop: "6px",
                    }}
                  >
                    Precio de venta por kilogramo.
                  </span>
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontWeight: "500",
                      color: "#333",
                    }}
                  >
                    Venta Mínima (Kg)
                  </label>
                  <input
                    type="number"
                    name="minimoVenta"
                    min="1"
                    step="1"
                    required
                    value={formData.minimoVenta}
                    onChange={handleInputChange}
                    style={{
                      width: "100%",
                      padding: "12px",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid #ccc",
                    }}
                    placeholder="Ej. 50"
                  />
                  <span
                    style={{
                      display: "block",
                      fontSize: "0.82rem",
                      color: "#666",
                      marginTop: "6px",
                    }}
                  >
                    Cantidad mínima a comprar.
                  </span>
                </div>
              </div>

              <h4
                style={{
                  color: "var(--color-secondary)",
                  borderBottom: "1px dashed #ccc",
                  paddingBottom: "8px",
                  marginBottom: "15px",
                }}
              >
                Foto del Cultivo
              </h4>
              <div
                style={{
                  border: "2px dashed #ccc",
                  borderRadius: "var(--radius-md)",
                  padding: "20px",
                  textAlign: "center",
                  backgroundColor: "#f9f9f9",
                  cursor: "pointer",
                  position: "relative",
                  overflow: "hidden",
                  minHeight: "140px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "center",
                }}
                onClick={() => fileInputRef.current.click()}
              >
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Preview"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      position: "absolute",
                      top: 0,
                      left: 0,
                    }}
                  />
                ) : (
                  <>
                    <span
                      style={{
                        fontSize: "2.5rem",
                        color: "#aaa",
                        marginBottom: "10px",
                      }}
                    >
                      📷
                    </span>
                    <span style={{ color: "#666", fontSize: "0.95rem" }}>
                      Haz clic para subir foto
                    </span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleImageChange}
                  style={{ display: "none" }}
                />
              </div>
            </div>
          </div>

          <div className="farmer-form-actions">
            <div>
              {formMode === "edit" && (
                <button
                  type="button"
                  onClick={handleDeleteCrop}
                  disabled={hasSales}
                  style={{
                    background: hasSales ? "#f5f5f5" : "#FFEBEE",
                    color: hasSales ? "#aaa" : "#d32f2f",
                    border: `1px solid ${hasSales ? "#eee" : "#ffcdd2"}`,
                    padding: "10px 20px",
                    borderRadius: "var(--radius-md)",
                    fontWeight: "bold",
                    cursor: hasSales ? "not-allowed" : "pointer",
                  }}
                >
                  🗑️ Eliminar Cultivo
                </button>
              )}
            </div>
            <div className="farmer-form-actions-buttons">
              <button
                type="button"
                onClick={() => setIsFormVisible(false)}
                style={{
                  background: "transparent",
                  color: "#555",
                  border: "1px solid #ccc",
                  padding: "14px 30px",
                  borderRadius: "var(--radius-md)",
                  fontWeight: "bold",
                  cursor: "pointer",
                  fontSize: "1.05rem",
                }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                style={{
                  backgroundColor: saving ? "#ccc" : "var(--color-primary)",
                  color: "white",
                  border: "none",
                  padding: "14px 40px",
                  borderRadius: "var(--radius-md)",
                  fontWeight: "bold",
                  cursor: saving ? "default" : "pointer",
                  fontSize: "1.05rem",
                  boxShadow: saving ? "none" : "0 4px 6px rgba(46,125,50,0.2)",
                }}
              >
                {saving
                  ? "⏳ Guardando..."
                  : formMode === "create"
                    ? "Publicar Cultivo"
                    : "Guardar Cambios"}
              </button>
            </div>
          </div>
        </form>
      </div>
    );
  };

  const renderEditModal = () => {
    if (!editingCrop) return null;
    const eD =
      parseInt(editingCrop.etapas.germinacion || 0) +
      parseInt(editingCrop.etapas.crecimiento || 0) +
      parseInt(editingCrop.etapas.floracion || 0) +
      parseInt(editingCrop.etapas.maduracion || 0);
    const newHarvestDate = addDaysToDate(editingCrop.fechaSiembra, eD);

    return (
      <div className="farmer-modal-overlay">
        <div className="farmer-modal-content">
          <div className="farmer-modal-header">
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: "1.5rem",
                  fontFamily: "var(--font-titles)",
                }}
              >
                Gestión de Cultivo Diario
              </h2>
              <p style={{ margin: "5px 0 0 0", opacity: 0.9 }}>
                {editingCrop.nombre} | Lote: {editingCrop.lote}
              </p>
            </div>
            <button
              onClick={() => setEditingCrop(null)}
              style={{
                background: "transparent",
                border: "none",
                color: "white",
                fontSize: "1.5rem",
                cursor: "pointer",
              }}
            >
              ✖
            </button>
          </div>

          {calcularAlerta20(
            editingCrop.fechaSiembra,
            editingCrop.diasTotalesEstimados,
          ) && (
            <div
              style={{
                backgroundColor: "#FFEBEE",
                color: "#d32f2f",
                padding: "10px 20px",
                fontWeight: "bold",
                fontSize: "0.9rem",
                borderBottom: "1px solid #ffcdd2",
              }}
            >
              ⚠️ Este cultivo lleva más del 20% de tiempo extra sin cosechar.
              Considera ajustar los días estimados.
            </div>
          )}

          <div className="farmer-modal-grid">
            <div
              style={{
                backgroundColor: "#F8F9FA",
                padding: "20px",
                borderRadius: "var(--radius-md)",
                border: "1px solid #eee",
              }}
            >
              <h4
                style={{
                  margin: "0 0 15px 0",
                  color: "var(--color-secondary)",
                }}
              >
                ⏱️ Ajuste Rápido de Tiempos (Días)
              </h4>
              <div className="farmer-modal-form-grid">
                <div>
                  <label style={{ fontSize: "0.85rem" }}>Germinación</label>
                  <input
                    type="number"
                    name="germinacion"
                    value={editingCrop.etapas.germinacion}
                    onChange={handleEditEtapaModalChange}
                    style={{
                      width: "100%",
                      padding: "8px",
                      borderRadius: "5px",
                      border: "1px solid #ccc",
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.85rem" }}>Crecimiento</label>
                  <input
                    type="number"
                    name="crecimiento"
                    value={editingCrop.etapas.crecimiento}
                    onChange={handleEditEtapaModalChange}
                    style={{
                      width: "100%",
                      padding: "8px",
                      borderRadius: "5px",
                      border: "1px solid #ccc",
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.85rem" }}>Floración</label>
                  <input
                    type="number"
                    name="floracion"
                    value={editingCrop.etapas.floracion}
                    onChange={handleEditEtapaModalChange}
                    style={{
                      width: "100%",
                      padding: "8px",
                      borderRadius: "5px",
                      border: "1px solid #ccc",
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.85rem" }}>Maduración</label>
                  <input
                    type="number"
                    name="maduracion"
                    value={editingCrop.etapas.maduracion}
                    onChange={handleEditEtapaModalChange}
                    style={{
                      width: "100%",
                      padding: "8px",
                      borderRadius: "5px",
                      border: "1px solid #ccc",
                    }}
                  />
                </div>
              </div>
              <div
                style={{
                  backgroundColor: "#e8f5e9",
                  padding: "15px",
                  borderRadius: "5px",
                  border: "1px solid #c8e6c9",
                  textAlign: "center",
                }}
              >
                <span
                  style={{
                    display: "block",
                    fontSize: "0.85rem",
                    color: "#2E7D32",
                  }}
                >
                  Nueva Proyección de Cosecha:
                </span>
                <strong style={{ fontSize: "1.2rem", color: "#1b5e20" }}>
                  {formatDateDisplay(newHarvestDate)}
                </strong>
              </div>
            </div>

            <div
              style={{
                backgroundColor: "#FFEBEE",
                padding: "20px",
                borderRadius: "var(--radius-md)",
                border: "1px solid #ffcdd2",
              }}
            >
              <h4 style={{ margin: "0 0 15px 0", color: "#d32f2f" }}>
                📢 Reportar Imprevisto
              </h4>
              <div style={{ marginBottom: "15px" }}>
                <select
                  value={incidentData.tipo}
                  onChange={(e) =>
                    setIncidentData({ ...incidentData, tipo: e.target.value })
                  }
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "5px",
                    border: "1px solid #ef9a9a",
                    backgroundColor: "white",
                  }}
                >
                  <option value="">-- Sin incidencia (No notificar) --</option>
                  <option value="Plaga o Enfermedad">
                    🐛 Plaga o Enfermedad
                  </option>
                  <option value="Clima Adverso">⛈️ Clima Adverso</option>
                  <option value="Problema Logístico">
                    🚜 Problema Logístico
                  </option>
                  <option value="Otro">⚠️ Otro</option>
                </select>
              </div>

              {incidentData.tipo !== "" && (
                <div style={{ marginBottom: "15px" }}>
                  <textarea
                    value={incidentData.descripcion}
                    onChange={(e) =>
                      setIncidentData({
                        ...incidentData,
                        descripcion: e.target.value,
                      })
                    }
                    placeholder="Explique brevemente a sus compradores..."
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: "5px",
                      border: "1px solid #ef9a9a",
                      minHeight: "80px",
                      fontFamily: "inherit",
                    }}
                  />
                </div>
              )}
            </div>

            {/* SECCIÓN MERMAS */}
            <div
              style={{
                backgroundColor: "#FFF8E1",
                padding: "20px",
                borderRadius: "var(--radius-md)",
                border: "1px solid #FFE082",
              }}
            >
              <h4 style={{ margin: "0 0 15px 0", color: "#F57F17" }}>
                📦 Registrar Merma / Pérdida de Stock
              </h4>
              <p
                style={{
                  fontSize: "0.85rem",
                  color: "#666",
                  marginBottom: "15px",
                  marginTop: 0,
                }}
              >
                Disponible: <strong style={{ color: "#F57F17" }}>{editingCrop.cantidadDisponible}</strong>
                {" · "}
                Máximo a reportar: <strong style={{ color: "#F57F17" }}>{editingCrop.stockTotalRestante}</strong>
              </p>

              <div style={{ marginBottom: "12px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.85rem",
                    marginBottom: "5px",
                    fontWeight: "500",
                  }}
                >
                  Cantidad Perdida (
                  {editingCrop.cantidadTotal?.split(" ")[1] || "Kg"})
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={mermaData.cantidadPerdida}
                  onChange={(e) =>
                    setMermaData({
                      ...mermaData,
                      cantidadPerdida: e.target.value,
                    })
                  }
                  placeholder="Ej. 50"
                  style={{
                    width: "100%",
                    padding: "8px",
                    borderRadius: "5px",
                    border: "1px solid #FFE082",
                  }}
                />
              </div>

              <div style={{ marginBottom: "12px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.85rem",
                    marginBottom: "5px",
                    fontWeight: "500",
                  }}
                >
                  Causa
                </label>
                <select
                  value={mermaData.causa}
                  onChange={(e) =>
                    setMermaData({ ...mermaData, causa: e.target.value })
                  }
                  style={{
                    width: "100%",
                    padding: "8px",
                    borderRadius: "5px",
                    border: "1px solid #FFE082",
                    backgroundColor: "white",
                  }}
                >
                  <option value="">-- Selecciona una causa --</option>
                  <option value="Plaga o Enfermedad">
                    🐛 Plaga o Enfermedad
                  </option>
                  <option value="Clima Adverso">⛈️ Clima Adverso</option>
                  <option value="Daño en Cosecha">🌾 Daño en Cosecha</option>
                  <option value="Problema de Almacenamiento">
                    🏚️ Problema de Almacenamiento
                  </option>
                  <option value="Otro">⚠️ Otro</option>
                </select>
              </div>

              <div style={{ marginBottom: "15px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.85rem",
                    marginBottom: "5px",
                    fontWeight: "500",
                  }}
                >
                  Observación (opcional)
                </label>
                <textarea
                  value={mermaData.observacion}
                  onChange={(e) =>
                    setMermaData({ ...mermaData, observacion: e.target.value })
                  }
                  placeholder="Describe brevemente lo ocurrido..."
                  style={{
                    width: "100%",
                    padding: "8px",
                    borderRadius: "5px",
                    border: "1px solid #FFE082",
                    minHeight: "60px",
                    fontFamily: "inherit",
                  }}
                />
              </div>

              <button
                type="button"
                onClick={handleGuardarMerma}
                disabled={!mermaData.cantidadPerdida || !mermaData.causa}
                style={{
                  width: "100%",
                  padding: "10px",
                  backgroundColor:
                    !mermaData.cantidadPerdida || !mermaData.causa
                      ? "#ccc"
                      : "#F57F17",
                  color: "white",
                  border: "none",
                  borderRadius: "5px",
                  cursor:
                    !mermaData.cantidadPerdida || !mermaData.causa
                      ? "default"
                      : "pointer",
                  fontWeight: "bold",
                }}
              >
                📦 Registrar Merma
              </button>
            </div>
          </div>
          {/* LÍNEA DE TIEMPO */}
          <div style={{
              borderTop: '2px solid #eee',
              marginTop: '20px'
          }}>
              <CultivoTimeline
                  cultivoId={editingCrop.id}
                  cultivoNombre={editingCrop.nombre}
              />
          </div>
          <div className="farmer-modal-actions">
            <button
              onClick={() => setEditingCrop(null)}
              style={{
                background: "white",
                border: "1px solid #ccc",
                padding: "10px 20px",
                borderRadius: "5px",
                cursor: "pointer",
                fontWeight: "bold",
                color: "#555",
              }}
            >
              Cancelar
            </button>
            <button
              onClick={saveGestionChanges}
              style={{
                background:
                  incidentData.tipo !== "" ? "#d32f2f" : "var(--color-primary)",
                color: "white",
                border: "none",
                padding: "10px 25px",
                borderRadius: "5px",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              {incidentData.tipo !== ""
                ? "🔔 Guardar y Notificar a Compradores"
                : "💾 Guardar Cambios"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ position: "relative", width: "100%" }}>
      {isFormVisible ? renderFormView() : renderListView()}
      {renderEditModal()}
    </div>
  );
}

export default FarmerProducts;
