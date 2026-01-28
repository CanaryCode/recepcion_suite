using System;
using System.Diagnostics;
using System.IO;
using System.Threading;
using System.Windows.Forms;
using System.Runtime.InteropServices;
using System.Drawing;

// Compile with: csc /target:winexe /out:RecepcionSuite.exe /win32icon:..\assets\resources\images\icono.ico Launcher.cs

namespace RecepcionSuiteLauncher
{
    class Program
    {
        [DllImport("user32.dll")]
        static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

        const int SW_HIDE = 0;
        const int SW_MINIMIZE = 6;

        static void Main()
        {
            string appDir = AppDomain.CurrentDomain.BaseDirectory;
            
            // 1. Detectar Node.js
            string nodePath = Path.Combine(appDir, "bin", "node.exe");
            if (!File.Exists(nodePath))
            {
                // Intentar encontrar en el sistema
                string systemNode = GetFullPathToNode();
                if (string.IsNullOrEmpty(systemNode))
                {
                    MessageBox.Show("No se encuentra Node.js.\n\nPor favor, asegura que existe la carpeta '/bin/node.exe' o que Node.js está instalado en el sistema.", 
                                    "Error Crítico", MessageBoxButtons.OK, MessageBoxIcon.Error);
                    return;
                }
                nodePath = systemNode;
            }

            // 2. Definir script del servidor
            string serverScript = Path.Combine(appDir, "server", "app.js");
            if (!File.Exists(serverScript))
            {
                MessageBox.Show("No se encuentra 'server/app.js'.\n\nEl archivo de servidor es necesario.", 
                                "Error Crítico", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return;
            }

            // 3. Iniciar el Servidor Node.js
            ProcessStartInfo psi = new ProcessStartInfo();
            psi.FileName = nodePath;
            psi.Arguments = "\"" + serverScript + "\"";
            psi.UseShellExecute = false;
            psi.CreateNoWindow = true; // OCULTO, sin ventana negra
            psi.WindowStyle = ProcessWindowStyle.Hidden;

            try
            {
                Process nodeProcess = Process.Start(psi);

                // Esperar un momento para que el servidor arranque
                Thread.Sleep(2000);

                // 4. Abrir el Navegador
                Process.Start("http://localhost:3000");

                // 5. Mantener el lanzador vivo hasta que Node muera
                // Node morirá cuando el Heartbeat falle (al cerrar el navegador)
                nodeProcess.WaitForExit();
            }
            catch (Exception ex)
            {
                MessageBox.Show("Error al iniciar el sistema:\n" + ex.Message, "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        static string GetFullPathToNode()
        {
            try
            {
                ProcessStartInfo psi = new ProcessStartInfo("where", "node");
                psi.RedirectStandardOutput = true;
                psi.UseShellExecute = false;
                psi.CreateNoWindow = true;
                
                Process p = Process.Start(psi);
                string output = p.StandardOutput.ReadLine();
                p.WaitForExit();
                
                if (!string.IsNullOrWhiteSpace(output) && File.Exists(output))
                    return output;
            }
            catch { }
            return null;
        }
    }
}
