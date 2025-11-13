using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MoneyTrack.Api.Migrations
{
    /// <inheritdoc />
    public partial class FixUniqueConstraint : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "ix_transaction_user_id_message_id",
                table: "transaction",
                columns: new[] { "user_id", "message_id" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_transaction_user_id_message_id",
                table: "transaction");
        }
    }
}
