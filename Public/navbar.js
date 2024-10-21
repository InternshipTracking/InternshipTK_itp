const BASE_URL = "http://localhost:3333";
      window.BASE_URL = BASE_URL;
      // ดึง navbar.html และใส่ไว้ใน div id="navbar"
      fetch("top-menu.html")
        .then((response) => response.text())
        .then((data) => {
          document.getElementById("navbar").innerHTML = data;

          // ตรวจสอบว่า token มีอยู่หรือไม่
          const token = localStorage.getItem("token");
          if (!token) {
            alert("กรุณาเข้าสู่ระบบก่อน");
            window.location.href = 'login.html';
          } else {
            // เรียก API เพื่อดึงข้อมูลผู้ใช้
            fetch(`${window.BASE_URL}/authen`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
            })
              .then((response) => response.json())
              .then((data) => {
                if (data.error) {
                  alert("กรุณาเข้าสู่ระบบก่อน");
                  window.location.href = "login.html";
                } else {
                  // แสดงชื่อผู้ใช้
                  document.getElementById("username2").textContent =
                    data.username;

                  // ตรวจสอบบทบาทและแสดงข้อความที่ถูกต้อง
                  if (data.role === "admin") {
                    document.getElementById("role").textContent = "Staff";
                    
                    // ตรวจสอบว่าแต่ละ element มีอยู่ใน DOM ก่อนทำงาน
                    const addMemberButton =
                      document.getElementById("addMemberButton");
                    const allAccButton =
                      document.getElementById("allAccButton");
                    const studentButton =
                      document.getElementById("studentButton");
                    const addAnnouncement =
                      document.getElementById("add-announcement");
                    const navbarDropdown =
                      document.getElementById("navbarDropdown");
                    const taskButtonPage =
                      document.getElementById("taskButtonPage");
                    const taskButtonPageUser =
                      document.getElementById("taskButtonPageUser");
                    if (addMemberButton)
                      addMemberButton.style.display = "block";
                    if (allAccButton) allAccButton.style.display = "block";
                    if (studentButton) studentButton.style.display = "block";
                    if (navbarDropdown) navbarDropdown.style.display = "block";
                    if (taskButtonPage) taskButtonPage.style.display = "block";   
                    if (addAnnouncement) addAnnouncement.style.display = "block";
                    if (btnDashboard) btnDashboard.style.display = "block";
                  } else if (data.role === "user") {
                    document.getElementById("role").textContent = "Internship";
                    const staffButton = document.getElementById("staffButton");
                    if (staffButton) staffButton.style.display = "block";
                    if (taskButtonPageUser) taskButtonPageUser.style.display = "block";
                    if (btnDashboardUser) btnDashboardUser.style.display = "block";
                  }

                  const payload = JSON.parse(atob(token.split(".")[1]));
                  window.payload = payload;
                }
              })
              .catch((error) => {
                console.error("Error:", error);
              });

            // ฟังก์ชัน Logout
            const logoutButton = document.getElementById("Logout");
            if (logoutButton) {
              logoutButton.addEventListener("click", function () {
                localStorage.removeItem("token");
                window.location.href = "login.html";
              });
            }

            // ฟังก์ชันสำหรับเปลี่ยนหน้า
            const profileButton = document.getElementById("profileButton");
            if (profileButton) {
              profileButton.addEventListener("click", function () {
                const userRole = payload.role;
                if (userRole === "admin") {
                  window.location.href = `admin-info.html?id=${payload.id}`;
                } else {
                  window.location.href = `user-info.html?id=${payload.id}`;
                }
              });
            }

            const taskButtonPage = document.getElementById("taskButtonPage");
            if (taskButtonPage) {
              taskButtonPage.addEventListener("click", function () {
                window.location.href = `all-task.html`;
              });
            }
            const taskButtonPageUser = document.getElementById("taskButtonPageUser");
            if (taskButtonPageUser) {
              taskButtonPageUser.addEventListener("click", function () {
                window.location.href = `user-task.html?id=${payload.id}`;
              });
            }

            const allAccButton = document.getElementById("allAccButton");
            if (allAccButton) {
              allAccButton.addEventListener("click", function () {
                window.location.href = `allAcc.html`;
              });
            }

            const btnDashboard = document.getElementById("btnDashboard");
            if (btnDashboard) {
              btnDashboard.addEventListener("click", function () {
                window.location.href = `dashboard.html`;
              });
            }

            const btnDashboardUser = document.getElementById("btnDashboardUser");
            if (btnDashboardUser) {
              btnDashboardUser.addEventListener("click", function () {
                window.location.href = `dashboardUser.html?id=${payload.id}`;
              });
            }

            const addMemberButton = document.getElementById("addMemberButton");
            if (addMemberButton) {
              addMemberButton.addEventListener("click", function () {
                window.location.href = "register.html";
              });
            }
          }
        });