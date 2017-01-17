const express=require("express");
const mysql_util=require("./mysql_util");
const bodyParser=require("body-parser");
const crypto=require("crypto");
const fs = require("fs");
const path = require("path");
const formidable = require("formidable");
const url=require("url");
const router=express.Router();

const setSession = require('./../utils/set-session');
const md5Pass = require('./../utils/md5-pass');
const hopeDB = require('./../utils/hopeDB.js');
const adminDB = hopeDB.adminDB;
const userDB = hopeDB.userDB;

// 管理员登录页面
router.route("/login").post(function(req,res){
	var password_md5=md5Pass(req.body.password);
	mysql_util.DBConnection.query("SELECT adminID,adminName,adminPassword FROM hopeadmin WHERE adminName=? AND adminPassword=?",[req.body.username,password_md5],function(err,rows,fields){
		if(err){
			var error={
				code:3,
				message:"服务端异常，请稍后再试或者联系管理员"
			};
			console.log(err);
			res.send(error)
		}else{
			if(rows.length==0){
				var error={
					code:2,
					message:"用户名或密码错误"
				};
				res.send(error)
			}else{
				res.cookie("adminId",rows[0].adminID,{
					maxAge: 30 * 60 * 1000,
                    path: '/',
				});
				var success={
					code:0,
					message:"成功",
					userId:rows[0].adminID
				}
                setSession(req,{adminID:rows[0].adminID,adminSign: true});
				res.send(success);
			}
		}
	})
}).get(function(req,res){
    if(req.session.adminSign){
        res.redirect('/admin');
        return;
    }
	res.render("public/login");
});
//管理员首页
router.route("/").get(function(req,res){
	if(!req.session.adminID){
		res.redirect("/admin/login");
	}else{
		var adminId=req.session.adminID;
		mysql_util.DBConnection.query("SELECT * FROM hopeadmin WHERE adminID=?",adminId,function(err,rows,fields){
			var admin=rows[0];
			if(rows[0].adminPermissions=="super"){
				mysql_util.DBConnection.query("SELECT * FROM hopereader",function(err,rows,fields){
					if(err){
						console.log(err);
						return;
					}
					var reader=rows;
					mysql_util.DBConnection.query("SELECT * FROM hopeadmin WHERE adminID!=?",adminId,function(err,rows,fields){
						if(err){
							console.log(err);
							return;
						}
						var adminUser=rows;
						var userPageNum=Math.ceil((adminUser.length+reader.length)/10);
						console.log(userPageNum);
						var user=adminUser.concat(reader);
						setSession(req,{adminSign: true});
						res.render("admin-super/index",{userName:admin.adminName,userImg:admin.adminImgSrc,userPermission:admin.adminPermissions,user:user,userPageNum:userPageNum,userPage:1,firstPath:"user",secondPath:''});
					});
				});
			}else if(rows[0].adminPermissions=="camera"){
				mysql_util.DBConnection.query("SELECT equipName,equipID,adminName FROM hopeequip,hopeadmin WHERE hopeequip.equipAdminID=hopeadmin.adminID ORDER BY equipLeft",req.cookies.adminId,function(err,rows,fields){
					if(err){
						console.log(err);
						return;
					}
					var equip=rows;
					mysql_util.DBConnection.query("SELECT COUNT(*) AS equipNum FROM hopeequip",function(err,rows,fields){
						if(err){
							console.log(err);
							return;
						}
						var equipNum=Math.ceil(rows[0].equipNum/10);
						mysql_util.DBConnection.query("SELECT readerName,borrowEquipID FROM hopereader,equipborrow WHERE borrowUserID=readerID AND returnWhe=0",function(err,rows,fields){
							if(err){
								console.log(err);
								return;
							}
							var borrower=[];
							for(var i=0,max=equip.length;i<max;i++){
								borrower[i]=0;
								for(var j=0,max1=rows.length;j<max1;j++){
									if(rows[j].borrowEquipID==equip[i].equipD){
										borrower[i]=rows[j].readerName;
									}
								}
							}
                            setSession(req,{adminSign: true});
							res.render("admin-equip/index",{userName:admin.adminName,userImg:admin.adminImgSrc,userPermission:admin.adminPermissions,equip:equip,borrower:borrower,equipNum:equipNum,equipPage:1,firstPath:'camera',secondPath:''});
						})
					})
				});
			}else{
				mysql_util.DBConnection.query("SELECT * FROM hopebook ORDER BY bookLeft",function(err,rows,fields){
					if(err){
						console.log(err);
					}else{
						var book=rows;
						mysql_util.DBConnection.query("SELECT COUNT(*) AS bookNum FROM hopebook",function(err,rows,fields){
							if(err){
								console.log(err);
								return;
							}
							var bookNum=Math.ceil(rows[0].bookNum/10);
							console.log("bookNum:"+bookNum)
							mysql_util.DBConnection.query("SELECT readerName,borrowBookID FROM hopereader,bookborrow WHERE borrowUserID=readerID AND returnWhe=0",function(err,rows,fields){
								if(err){
									console.log(err);
								}else{
									var borrower=[];
									for(var i=0,max=book.length;i<max;i++){
										borrower[i]=0;
										for(var j=0,max1=rows.length;j<max1;j++){
											if(rows[j].borrowBookID==book[i].bookID){
												borrower[i]=rows[j].readerName;
											}
									 	}
									}
									setSession(req,{adminSign: true});
								res.render("admin-book/index",{userName:admin.adminName,userImg:admin.adminImgSrc,userPermission:admin.adminPermissions,book:book,borrower:borrower,bookNum:bookNum,bookPage:1,firstPath:'book',secondPath:''});
								}
							})
						})		
					}
				});
			}
		})
	}
})


// 管理员修改密码界面
router.route("/reset").get(function(req,res){
	if(!req.session.adminID){
		res.redirect("/admin/login");
		return;
	}
	mysql_util.DBConnection.query("SELECT * FROM hopeadmin WHERE adminID=?",req.session.adminID,function(err,rows,fields){
		if(err){
			console.log(err);
			return;
		}
		var userName=rows[0].adminName,
		    userImg=rows[0].adminImgSrc,
		    userPermission=rows[0].adminPermissions;
        setSession(req,{adminSign: true});
		res.render("admin/admin-reset",{userName:userName,userImg:userImg,userPermission:userPermission,firstPath:'account',secondPath:'reset'});
	});
}).post(function(req,res){
	var password_md5 = md5Pass(req.body.password);
	// mysql_util.DBConnection.query("UPDATE hopeadmin SET adminPassword=? WHERE adminID=?",[password_md5,req.cookies.adminId],function(err,rows,fields){
	// 	if(err){
	// 		console.log(err);
	// 		return;
	// 	}
	// 	var success={
	// 		message:"修改成功",
	// 	};
	console.log('md5' + password_md5);
		adminDB.resetPassword(req.session.adminID,password_md5,(message) => {
		    res.send(message);
        })
/*		res.send(success);*/
	// });
});
//管理员修改头像页面
router.route("/modify-img").post(function(req,res){
	console.log(req.session.adminID);
	var form = new formidable.IncomingForm();
	form.encoding = "utf-8";
	form.uploadDir =path.join("./","public/img/admin");
	form.keepExtensions=true;
	form.maxFieldsSize=2*1024*1024;
	console.log("kkkk");
	form.parse(req,function(err,fields,files){
		console.log(files);
		var extension = files.img.path.substring(files.img.path.lastIndexOf("."));
		var newName="/admin"+req.cookies.userId+Date.now()+extension;
		var newPath=form.uploadDir+newName;
		fs.renameSync(files.img.path,newPath);
		var DBImgSrc="/img/admin"+newName;
		var mysqlQuery="UPDATE hopeadmin SET adminImgSrc=? WHERE adminID=?";
		console.log(mysqlQuery);
		mysql_util.DBConnection.query(mysqlQuery,[DBImgSrc,req.cookies.adminId],function(err,rows,fields){
			if(err){
				console.log(err);
				return;
			}
			var success={
				code:1
			}
			res.send(success);
		})
	});
})
//管理员修改信息
router.route("/modify").get(function(req,res){
	if(!req.session.adminID){
		res.redirect("/admin/login");
		return;
	}
	mysql_util.DBConnection.query("SELECT * FROM hopeadmin WHERE adminID=?",req.cookies.adminId,function(err,rows,fields){
		var userName=rows[0].adminName,
		    userImg=rows[0].adminImgSrc,
		    userPermission=rows[0].adminPermissions;
        setSession(req,{adminSign: true});
		res.render("admin/admin-modify",{userName:userName,userImg:userImg,userPermission:userPermission,user:rows[0],firstPath:'account',secondPath:'modify'});
	})
}).post(function(req,res){
	mysql_util.DBConnection.query("UPDATE hopeadmin SET adminEmail=? WHERE adminID=?",[req.body.readerEmail,req.cookies.adminId],function(err,rows,fields){
		if(err){
			console.log(err)
			return;
		}
		var success={
			message:"修改成功"
		};
		res.send(success);
	});
});

// 超级管理员修改用户信息页面
router.route("/adminmodifyuser/:userID").get(function(req,res){
	if(!req.session.adminID){
		res.redirect("/admin/login");
	}
	var userType=req.params.userID.replace(/\d/g,""),
	    userID=req.params.userID.replace(/\D/g,"");
	console.log("uerType="+userType);
	console.log("userID="+userID);
	mysql_util.DBConnection.query("SELECT * FROM hopeadmin WHERE adminID=?",req.cookies.adminId,function(err,rows,fields){
		if(err){
			console.log(err);
			return;
		}
		var userName=rows[0].adminName;
		var userImg=rows[0].adminImgSrc;
		var userPermission=rows[0].adminPermissions;
		if(userType=="user"){
			console.log("user")
			mysql_util.DBConnection.query("SELECT * FROM hopereader WHERE readerID=?",userID,function(err,rows,fields){
				if(err){
					console.log(err);
					return;
				}
				var hopeGroup=["网管组","编程组","设计组","前端组","数码组"];
                setSession(req,{adminSign: true});
				res.render("admin-super/admin-super-modify-user",{userName:userName,userImg:userImg,userPermission:userPermission,user:rows[0],hopeGroup:hopeGroup,firstPath:"user",secondPath:''});
			});

		}else if(userType == "admin"){
			console.log("admin")
			mysql_util.DBConnection.query("SELECT * FROM hopeadmin WHERE adminID=?",userID,function(err,rows,fields){
				if(err){
					console.log(err);
					return;
				}
                setSession(req,{adminSign: true});
				res.render("admin-super/admin-super-modify-user",{userName:userName,userImg:userImg,userPermission:userPermission,user:rows[0],firstPath:"user",secondPath:''});
			});
		}
	});
}).post(function(req,res){
	var userType=req.params.userID.replace(/\d/g,""),
	    userID=req.params.userID.replace(/\D/g,"");
	if(userType=="user"){
		var mysqlParams=[req.body.readerName,
		                 req.body.sex,
		                 req.body.studentNumber,
		                 req.body.readerMajor,
		                 req.body.readerPhone,
		                 req.body.readerEmail,
		                 req.body.readerGroup,
		                 userID];
		console.log(mysqlParams)
		var mysqlQuery=["UPDATE hopereader SET readerName=?,",
		                "readerSex=?,studentNumber=?,",
		                "readerMajor=?,readerPhone=?,",
		                "readerEmail=?,readerGroup=?",
		                " WHERE readerID=?"].join("")
		mysql_util.DBConnection.query(mysqlQuery,mysqlParams,function(err,rows,fields){
			if(err){
				console.log(err);
				return;
			}
			var success={
				message:"修改成功"
			};
			res.send(success);

		})
	}else if(userType="admin"){
		var mysqlParams=[req.body.readerName,
		                 req.body.readerEmail,
		                 req.body.permission,
		                 userID];
		console.log(mysqlParams);
		mysql_util.DBConnection.query("UPDATE hopeadmin SET adminName=?,adminEmail=?,adminPermissions=? WHERE adminID=?",mysqlParams,function(err,rows,fields){
			if(err){
				console.log(err);
				return;
			}
			var success={
				message:"修改成功"
			};
			res.send(success);
		})
	}
	
});
module.exports=router;