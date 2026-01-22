-- Database Schema for Hotel Management System

CREATE DATABASE IF NOT EXISTS hotel_manager;
USE hotel_manager;

-- 1. RIU CLASS CUSTOMERS
CREATE TABLE IF NOT EXISTS clientes_riu (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titular VARCHAR(255) NOT NULL,
    num_tarjeta VARCHAR(50) NOT NULL,
    habitacion VARCHAR(10),
    fecha_entrada DATE,
    fecha_salida DATE,
    adultos INT DEFAULT 1,
    ninos INT DEFAULT 0,
    nivel VARCHAR(20) DEFAULT 'Classic', -- Classic, Gold, Diamond
    comentario TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. SAFE RENTALS
CREATE TABLE IF NOT EXISTS safe_rentals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    habitacion VARCHAR(10) NOT NULL UNIQUE,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    dias INT,
    coste DECIMAL(10, 2),
    pagado BOOLEAN DEFAULT FALSE,
    comentario TEXT,
    recepcionista VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. DESPERTADORES
CREATE TABLE IF NOT EXISTS despertadores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    habitacion VARCHAR(10) NOT NULL,
    hora VARCHAR(5) NOT NULL, -- Format HH:mm
    comentario TEXT,
    autor VARCHAR(100),
    estado VARCHAR(20) DEFAULT 'Pendiente', -- Pendiente, Realizado
    fecha_programada DATE DEFAULT (CURRENT_DATE),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. ESTANCIA (OCCUPANCY STATS)
CREATE TABLE IF NOT EXISTS estancia_diaria (
    fecha DATE PRIMARY KEY,
    ocupadas INT DEFAULT 0,
    vacias INT DEFAULT 0,
    total_hab INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. NOVEDADES (LOGBOOK)
CREATE TABLE IF NOT EXISTS novedades (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fecha DATE NOT NULL,
    hora VARCHAR(5) NOT NULL,
    prioridad VARCHAR(20) NOT NULL, -- Normal, Urgente
    autor VARCHAR(100) NOT NULL,
    texto TEXT NOT NULL,
    comentario TEXT, -- Seguimiento
    departamentos JSON, -- Array of strings e.g. ["Recepción", "Pisos"]
    estado VARCHAR(20) DEFAULT 'Pendiente', -- Pendiente, En Proceso, Terminada
    fecha_modificacion VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. NOTAS PERMANENTES
CREATE TABLE IF NOT EXISTS notas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(255),
    contenido TEXT,
    color VARCHAR(20) DEFAULT 'note-yellow',
    rotacion VARCHAR(10) DEFAULT '0',
    fecha_creacion VARCHAR(50), -- String format stored in frontend currently
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. PRECIOS (PRODUCT LIST)
CREATE TABLE IF NOT EXISTS precios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    precio DECIMAL(10, 2) NOT NULL,
    icono TEXT, -- Emoji or Base64 Image
    comentario VARCHAR(255),
    favorito BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. AGENDA CONTACTOS
CREATE TABLE IF NOT EXISTS agenda_contactos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    vinculo VARCHAR(50), -- Empresa, Cliente, Hotel, Otro
    categoria VARCHAR(50), -- Urgencia, Información, Extensión
    telefonos JSON, -- Array of objects { tipo, prefijo, numero, flag }
    email VARCHAR(255),
    web VARCHAR(255),
    direccion JSON, -- { pais, ciudad, calle, numero, cp }
    comentarios TEXT,
    favorito BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. AYUDA (CHECKLISTS GUIDE)
CREATE TABLE IF NOT EXISTS guia_checks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    turno VARCHAR(20) NOT NULL, -- mañana, tarde, noche
    texto TEXT NOT NULL,
    hecho BOOLEAN DEFAULT FALSE,
    orden INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
