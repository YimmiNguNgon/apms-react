const fs = require('fs');
let code = fs.readFileSync('D:/APMS/apms-backend/src/main/java/com/apms/domain/profile/CompanyProfile.java', 'utf8');
code = code.replace(
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Contact {,
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Contact {
);
fs.writeFileSync('D:/APMS/apms-backend/src/main/java/com/apms/domain/profile/CompanyProfile.java', code);
