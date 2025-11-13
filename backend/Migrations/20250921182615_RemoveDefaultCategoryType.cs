using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MoneyTrack.Api.Migrations
{
    /// <inheritdoc />
    public partial class RemoveDefaultCategoryType : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "type",
                table: "category",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text",
                oldDefaultValue: "Expense");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "type",
                table: "category",
                type: "text",
                nullable: false,
                defaultValue: "Expense",
                oldClrType: typeof(string),
                oldType: "text");
        }
    }
}
